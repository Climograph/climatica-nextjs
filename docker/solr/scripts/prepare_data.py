import csv
import os
from collections import defaultdict

# * paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "../data")

ALL_COUNTRIES = os.path.join(DATA_DIR, "allCountries.txt")
ALTERNATE_NAMES = os.path.join(DATA_DIR, "alternateNamesV2.txt")
OUTPUT_CSV = os.path.join(DATA_DIR, "cities.csv")

# * feature codes to include
ALLOWED_FEATURE_CODES = {
    "PPL",    # populated place
    "PPLA",   # seat of first-order admin division
    "PPLA2",  # seat of second-order admin division
    "PPLA3",  # seat of third-order admin division
    "PPLA4",  # seat of fourth-order admin division
    "PPLA5",  # seat of fifth-order admin division
    "PPLC",   # capital city
}

# * languages to extract from alternateNamesV2
TARGET_LANGS = {"en", "uk", "es"}


def load_alternate_names():
    print("Loading alternate names...")

    # * structure: geonameid -> lang -> (name, alt_id, is_preferred)
    # * we pick the best name per lang using priority:
    # *   1. earliest entry with preferred=1
    # *   2. earliest entry if no one has preferred=1
    names = defaultdict(lambda: {
        lang: {"name": None, "alt_id": 0, "preferred": False}
        for lang in TARGET_LANGS
    })

    with open(ALTERNATE_NAMES, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) < 4:
                continue

            try:
                alt_id = int(parts[0])
            except ValueError:
                continue

            geonameid = parts[1]
            lang = parts[2]
            name = parts[3]

            # * skip non-language entries (link, wkdt, abbr, etc.)
            if lang not in TARGET_LANGS:
                continue

            # * is_preferred is column index 4 or 5 (value "1" means preferred)
            is_preferred = ((len(parts) > 4 and parts[4] == "1") or (len(parts) > 5 and parts[5] == "1"))

            current = names[geonameid][lang]

            should_update = False

            if current["name"] is None:
                # * first entry for this lang — always take it
                should_update = True
            elif is_preferred and not current["preferred"]:
                # * new entry is preferred, current is not — upgrade
                should_update = True
            # ! NO FURTHER PROCESSING
            # elif is_preferred and current["preferred"] and alt_id > current["alt_id"]:
                # * both preferred — take the more recent one
            #   should_update = True
            # elif not is_preferred and not current["preferred"] and alt_id > current["alt_id"]:
                # * neither preferred — take the more recent one
            #   should_update = True

            if should_update:
                names[geonameid][lang] = {
                    "name": name,
                    "alt_id": alt_id,
                    "preferred": is_preferred,
                }

    # * flatten to simple geonameid -> lang -> name dict
    result = {}
    for geonameid, langs in names.items():
        result[geonameid] = {lang: data["name"] for lang, data in langs.items()}

    print(f"Loaded alternate names for {len(result)} places")
    return result


def prepare_cities():
    alt_names = load_alternate_names()

    print("Processing allCountries.txt...")

    count = 0
    skipped = 0

    with open(ALL_COUNTRIES, encoding="utf-8") as infile, \
         open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as outfile:

        writer = csv.writer(outfile)

        # * header
        writer.writerow([
            "id",
            "geonameid",
            "label_en",
            "label_uk",
            "label_es",
            "latitude",
            "longitude",
            "feature_code",
            "country_code",
            "population",
        ])

        for line in infile:
            parts = line.strip().split("\t")
            if len(parts) < 15:
                skipped += 1
                continue

            # * allCountries.txt columns:
            # 0  geonameid
            # 1  name (default name, often the local transliteration)
            # 2  asciiname (ASCII-safe version)
            # 4  latitude
            # 5  longitude
            # 7  feature_code
            # 8  country_code
            # 14 population

            geonameid    = parts[0]
            default_name = parts[1]
            ascii_name   = parts[2]
            latitude     = parts[4]
            longitude    = parts[5]
            feature_code = parts[7]
            country_code = parts[8]
            population   = parts[14] or "0"

            if feature_code not in ALLOWED_FEATURE_CODES:
                skipped += 1
                continue

            alt = alt_names.get(geonameid, {})

            # * for label_en prefer:
            # *   1. alternate name with lang=en (preferred/recent)
            # *   2. ascii_name (no diacritics, good for search)
            # *   3. default_name as last resort
            label_en = alt.get("en") or ascii_name or default_name
            label_uk = alt.get("uk") or label_en
            label_es = alt.get("es") or label_en

            writer.writerow([
                geonameid,
                geonameid,
                label_en,
                label_uk,
                label_es,
                latitude,
                longitude,
                feature_code,
                country_code,
                population,
            ])

            count += 1
            if count % 100_000 == 0:
                print(f"  Processed {count:,} cities...")

    print(f"\nDone!")
    print(f"  Cities written: {count:,}")
    print(f"  Rows skipped:   {skipped:,}")
    print(f"  Output: {OUTPUT_CSV}")


if __name__ == "__main__":
    prepare_cities()