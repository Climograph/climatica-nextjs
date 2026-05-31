import "server-only";

import { env } from "@/libs/Env";
import { logger } from "@/libs/Logger";
import type { TSolrCityDoc, TSolrResponse, TWikidataCity } from "@/types";
import { buildSolrQueryParams, getCityDescription } from "@/utils"; // removed buildQueryParams

const SOLR_BASE_URL = env.SOLR_URL;

export const SolrService = {
  async searchCities(query: string, lang: string): Promise<TWikidataCity[]> {
    const params = buildSolrQueryParams(query, lang);

    const url = `${SOLR_BASE_URL}/solr/cities/cities?${params}`;
    const start = Date.now();

    try {
      const response = await fetch(url, {
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        throw new Error(`Solr responded with status ${response.status}`);
      }

      const data: TSolrResponse = await response.json();

      if (data.responseHeader.status !== 0) {
        throw new Error(`Solr error status: ${data.responseHeader.status}`);
      }

      const seen = new Set<string>();
      const mapped = data.response.docs
        .filter((doc) => {
          const id = String(doc.geonameid);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((doc) => SolrService.mapToCity(doc, lang));
      logger.info(`[Solr] searchCities took ${Date.now() - start}ms for query "${query}"`);
      return mapped;
    } catch (error) {
      logger.error(
        `[Solr] searchCities error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  },

  getLabelField(lang: string): string {
    const map: Record<string, string> = {
      uk: "label_uk",
      es: "label_es",
      en: "label_en",
    };
    return map[lang] ?? "label_en";
  },

  mapToCity(doc: TSolrCityDoc, lang: string): TWikidataCity {
    const labelField = SolrService.getLabelField(lang);
    const label = (doc[labelField as keyof TSolrCityDoc] as string) ?? doc.label_en;

    return {
      id: String(doc.geonameid),
      label,
      description: getCityDescription(doc.feature_code, doc.country_code, lang),
      lat: doc.latitude,
      lng: doc.longitude,
    };
  },
};
