import { buildSolrQueryParams } from "@/utils/solr.util";
import { describe, expect, it } from "vitest";

describe("buildSolrQueryParams", () => {
  it("boosts label_en for lang en", () => {
    const params = buildSolrQueryParams("rome", "en");
    expect(params.get("qf")).toContain("label_en^25");
    expect(params.get("pf")).toContain("label_en^40");
  });

  it("boosts label_uk for lang uk", () => {
    const params = buildSolrQueryParams("київ", "uk");
    expect(params.get("qf")).toContain("label_uk^25");
    expect(params.get("pf")).toContain("label_uk^40");
  });

  it("boosts label_es for lang es", () => {
    const params = buildSolrQueryParams("madrid", "es");
    expect(params.get("qf")).toContain("label_es^25");
    expect(params.get("pf")).toContain("label_es^40");
  });

  it("falls back to en boost for unknown lang", () => {
    const params = buildSolrQueryParams("paris", "fr");
    expect(params.get("qf")).toContain("label_en^25");
  });

  it("trims query whitespace", () => {
    const params = buildSolrQueryParams("  rome  ", "en");
    expect(params.get("q")).toBe("rome");
  });
});
