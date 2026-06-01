import { MONTH_NAMES } from "@/constants";
import { useTranslations } from "next-intl";
import type { TWLTooltipProps } from "../WalterLiethChart.type";

export function WalterLiethTooltip({ active, label, wlData }: TWLTooltipProps) {
  const t = useTranslations();
  if (!active || !label) return null;

  const point = wlData?.find((d) => d.monthName === label);
  if (!point) return null;

  const isArid = point.tavg * 2 > point.prec;
  const monthIdx = (MONTH_NAMES as readonly string[]).indexOf(label);
  const displayLabel = monthIdx >= 0 ? t(`months.${monthIdx + 1}`) : label;

  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
      style={{ fontSize: 13 }}
    >
      <p className="mb-1 font-semibold text-[var(--color-text)]">{displayLabel}</p>
      <p style={{ color: "var(--color-wl-temp-line-a)" }}>
        {t("chart.avgTemperature")}: {point.tavg.toFixed(2)}°C
      </p>
      <p style={{ color: "var(--color-wl-prec-line-a)" }}>
        {t("chart.precipitation")}: {point.prec.toFixed(2)} mm
      </p>
      <p
        className="mt-1"
        style={{ color: isArid ? "var(--color-wl-arid-tooltip)" : "var(--color-wl-prec-line-b)" }}
      >
        {isArid ? t("chart.aridPeriod") : t("chart.humidPeriod")}
      </p>
    </div>
  );
}
