export function buildSolrQueryParams(query: string, lang: string): URLSearchParams {
  const qf =
    lang === "es"
      ? "label_es^25 label_en^12 label_uk^8 label_es_ngram^3 label_en_ngram^1 label_uk_ngram^1"
      : lang === "uk"
        ? "label_uk^25 label_en^12 label_es^8 label_uk_ngram^3 label_en_ngram^1 label_es_ngram^1"
        : "label_en^25 label_es^12 label_uk^8 label_en_ngram^3 label_es_ngram^1 label_uk_ngram^1";

  const pf =
    lang === "es"
      ? "label_es^40 label_en^20 label_uk^15"
      : lang === "uk"
        ? "label_uk^40 label_en^20 label_es^15"
        : "label_en^40 label_es^20 label_uk^15";

  return new URLSearchParams({ q: query.trim(), qf, pf });
}
