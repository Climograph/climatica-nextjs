import { getMartonneLabelKey } from "@/utils/martonne.util";
import { CLIMATE_COMPARISON_COLORS } from "@/constants";
import { useTranslations } from "next-intl";
import type { TCompareStatsGridProps } from "./CompareStatsGrid.type";

export function CompareStatsGrid({
  labelA,
  labelB,
  statsA,
  statsB,
  altitudeA,
  altitudeB,
  activeColumn,
}: TCompareStatsGridProps) {
  const t = useTranslations();

  const rows = [
    {
      label: t("climateComparison.stats.avgTmax"),
      a: `${statsA.avgTmax.toFixed(1)} °C`,
      b: `${statsB.avgTmax.toFixed(1)} °C`,
    },
    {
      label: t("climateComparison.stats.avgTmin"),
      a: `${statsA.avgTmin.toFixed(1)} °C`,
      b: `${statsB.avgTmin.toFixed(1)} °C`,
    },
    {
      label: t("climateComparison.stats.totalPrec"),
      a: `${statsA.totalPrec.toFixed(0)} mm`,
      b: `${statsB.totalPrec.toFixed(0)} mm`,
    },
    {
      label: t("climateComparison.stats.aridMonths"),
      a: String(statsA.aridMonths),
      b: String(statsB.aridMonths),
    },
  ];

  const showAltitude = altitudeA != null || altitudeB != null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="w-full table-fixed text-[length:var(--font-sm)]">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-2.5 text-left font-medium text-[var(--color-text-secondary)]" />
            <th
              className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 0 ? "bg-[var(--color-chip-active-bg)]" : ""}`}
              style={{ color: CLIMATE_COMPARISON_COLORS.A.tmax }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CLIMATE_COMPARISON_COLORS.A.tmax }}
                />
                {labelA}
              </span>
            </th>
            <th
              className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 1 ? "bg-[var(--color-city-b-tint)]" : ""}`}
              style={{ color: CLIMATE_COMPARISON_COLORS.B.tmax }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CLIMATE_COMPARISON_COLORS.B.tmax }}
                />
                {labelB}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={`border-b border-[var(--color-border)] ${i % 2 === 0 ? "bg-[var(--color-bg)]" : "bg-[var(--color-bg-secondary)]"}`}
            >
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{row.label}</td>
              <td
                className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 0 ? "bg-[var(--color-chip-active-bg)]" : ""}`}
                style={{ color: CLIMATE_COMPARISON_COLORS.A.tmax }}
              >
                {row.a}
              </td>
              <td
                className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 1 ? "bg-[var(--color-city-b-tint)]" : ""}`}
                style={{ color: CLIMATE_COMPARISON_COLORS.B.tmax }}
              >
                {row.b}
              </td>
            </tr>
          ))}
          {showAltitude && (
            <tr
              className={`border-b border-[var(--color-border)] ${rows.length % 2 === 0 ? "bg-[var(--color-bg)]" : "bg-[var(--color-bg-secondary)]"}`}
            >
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                {t("chart.altitude")}
              </td>
              <td
                className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 0 ? "bg-[var(--color-chip-active-bg)]" : ""}`}
                style={{ color: CLIMATE_COMPARISON_COLORS.A.tmax }}
              >
                {altitudeA != null ? `${altitudeA} m` : "—"}
              </td>
              <td
                className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 1 ? "bg-[var(--color-city-b-tint)]" : ""}`}
                style={{ color: CLIMATE_COMPARISON_COLORS.B.tmax }}
              >
                {altitudeB != null ? `${altitudeB} m` : "—"}
              </td>
            </tr>
          )}
          <tr
            className={`${(rows.length + (showAltitude ? 1 : 0)) % 2 === 0 ? "bg-[var(--color-bg)]" : "bg-[var(--color-bg-secondary)]"}`}
          >
            <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
              {t("climateComparison.stats.martonne")}
            </td>
            <td
              className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 0 ? "bg-[var(--color-chip-active-bg)]" : ""}`}
              style={{ color: CLIMATE_COMPARISON_COLORS.A.tmax }}
            >
              <span className="inline-flex items-center gap-1.5">
                {statsA.martonneIndex !== null ? statsA.martonneIndex.toFixed(1) : "—"}
                {statsA.martonneIndex !== null && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ padding: "2px 6px", borderRadius: 8 }}
                  >
                    {t(getMartonneLabelKey(statsA.martonneIndex))}
                  </span>
                )}
              </span>
            </td>
            <td
              className={`px-4 py-2.5 text-center font-semibold transition-colors duration-200 ${activeColumn === 1 ? "bg-[var(--color-city-b-tint)]" : ""}`}
              style={{ color: CLIMATE_COMPARISON_COLORS.B.tmax }}
            >
              <span className="inline-flex items-center gap-1.5">
                {statsB.martonneIndex !== null ? statsB.martonneIndex.toFixed(1) : "—"}
                {statsB.martonneIndex !== null && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ padding: "2px 6px", borderRadius: 8 }}
                  >
                    {t(getMartonneLabelKey(statsB.martonneIndex))}
                  </span>
                )}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
