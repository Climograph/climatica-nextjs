import { getMartonneBadge } from "@/utils";
import { useTranslations } from "next-intl";
import type { TClimateStatsBarProps, TDualValueProps } from "./ClimateStatsBar.type";

const CELL_BORDER = "0.5px solid var(--color-border)";

function DualValue({ a, b, aColor, bColor }: TDualValueProps) {
  return (
    <span className="flex items-center gap-0.5 text-[16px] font-medium tabular-nums">
      <span style={{ color: aColor }}>{a}</span>
      <span style={{ color: "var(--color-border)" }}>/</span>
      <span style={{ color: bColor }}>{b}</span>
    </span>
  );
}

export function ClimateStatsBar({
  meanTemp,
  annualPrecip,
  aridMonths,
  altitude,
  martonneIndex,
  comparison,
  primaryColor,
}: TClimateStatsBarProps) {
  const t = useTranslations();

  const isCompare = comparison !== undefined;
  const showAltitude = altitude !== undefined || (isCompare && comparison.altitude !== undefined);
  const colCount = showAltitude ? 5 : 4;

  const pColor = primaryColor ?? "var(--color-text)";

  return (
    <div
      className="mb-3 grid overflow-hidden rounded-[var(--radius-md)]"
      style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)`, border: CELL_BORDER }}
    >
      <div
        className="flex items-center justify-between px-4 py-[10px]"
        style={{ borderRight: CELL_BORDER }}
      >
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {t("chart.meanTemp")}
        </span>
        {isCompare ? (
          <DualValue
            a={`${meanTemp.toFixed(1)}°C`}
            b={`${comparison.meanTemp.toFixed(1)}°C`}
            aColor={pColor}
            bColor={comparison.color}
          />
        ) : (
          <span className="text-[16px] font-medium tabular-nums text-[var(--color-text)]">
            {meanTemp.toFixed(1)}°C
          </span>
        )}
      </div>

      <div
        className="flex items-center justify-between px-4 py-[10px]"
        style={{ borderRight: CELL_BORDER }}
      >
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {t("chart.annualPrec")}
        </span>
        {isCompare ? (
          <DualValue
            a={`${annualPrecip} mm`}
            b={`${comparison.annualPrecip} mm`}
            aColor={pColor}
            bColor={comparison.color}
          />
        ) : (
          <span className="text-[16px] font-medium tabular-nums text-[var(--color-text)]">
            {annualPrecip} mm
          </span>
        )}
      </div>

      <div
        className="flex items-center justify-between px-4 py-[10px]"
        style={{ borderRight: CELL_BORDER }}
      >
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {t("chart.aridMonths")}
        </span>
        {isCompare ? (
          <DualValue
            a={String(aridMonths)}
            b={String(comparison.aridMonths)}
            aColor={pColor}
            bColor={comparison.color}
          />
        ) : (
          <span className="text-[16px] font-medium tabular-nums text-[var(--color-text)]">
            {aridMonths}
          </span>
        )}
      </div>

      {showAltitude && (
        <div
          className="flex items-center justify-between px-4 py-[10px]"
          style={{ borderRight: CELL_BORDER }}
        >
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {t("chart.altitude")}
          </span>
          {isCompare ? (
            <DualValue
              a={altitude !== undefined ? `${altitude} m` : "—"}
              b={comparison.altitude !== undefined ? `${comparison.altitude} m` : "—"}
              aColor={pColor}
              bColor={comparison.color}
            />
          ) : (
            <span className="text-[16px] font-medium tabular-nums text-[var(--color-text)]">
              {altitude} m
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-center justify-between px-4 py-[10px]"
        title={t("chart.martonneTooltip")}
      >
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {t("chart.martonne")}
        </span>
        {isCompare ? (
          <DualValue
            a={martonneIndex !== null ? martonneIndex.toFixed(1) : "—"}
            b={comparison.martonneIndex !== null ? comparison.martonneIndex.toFixed(1) : "—"}
            aColor={pColor}
            bColor={comparison.color}
          />
        ) : (
          <span className="flex items-center gap-1.5">
            <span
              className="text-[16px] font-medium tabular-nums text-[var(--color-text)]"
              style={{ cursor: "help" }}
            >
              {martonneIndex !== null ? martonneIndex.toFixed(1) : "—"}
            </span>
            {martonneIndex !== null &&
              (() => {
                const badge = getMartonneBadge(martonneIndex);
                return (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {t(badge.labelKey)}
                  </span>
                );
              })()}
          </span>
        )}
      </div>
    </div>
  );
}
