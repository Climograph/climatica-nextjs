import { AridityLegend } from "@/components/WalterLiethChart";
import { MONTH_NAMES } from "@/constants";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PrecipBarShape } from "../../components";
import { CHART_COLORS } from "../../TempPrecipChart.constant";
import type { TDotRendererProps } from "../../TempPrecipChart.type";
import type { TCompareChartProps } from "./CompareChart.type";

function CompareModeLegend({
  labelA,
  labelB,
}: {
  labelA: string | undefined;
  labelB: string | undefined;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-1 pt-3" style={{ fontSize: 11 }}>
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CHART_COLORS.compareA.tmax }}
          />
          <span style={{ color: CHART_COLORS.compareA.tmax }}>{labelA}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CHART_COLORS.compareB.tmax }}
          />
          <span style={{ color: CHART_COLORS.compareB.tmax }}>{labelB}</span>
        </span>
      </div>
      <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 10 }}>
        {t("chart.legend.seriesNote")}
      </span>
    </div>
  );
}

export function CompareChart({
  chartData,
  visible,
  labelA,
  labelB,
  scales,
  rightMax,
  selectedMonths,
  showAridity = true,
  aridityA,
}: TCompareChartProps) {
  const t = useTranslations();

  const aridityByMonthA = useMemo<Record<number, boolean> | undefined>(() => {
    if (!aridityA) return undefined;
    return Object.fromEntries(aridityA.map((m) => [m.month, m.isArid]));
  }, [aridityA]);

  function localMonthName(v: unknown): string {
    const idx = (MONTH_NAMES as readonly string[]).indexOf(String(v));
    return idx >= 0 ? t(`months.${idx + 1}`) : String(v);
  }

  function makeDot(color: string) {
    function DotRenderer({ cx = 0, cy = 0, fill = color, index = -1 }: TDotRendererProps) {
      const month = index >= 0 ? index + 1 : -1;
      const isSelected =
        !selectedMonths || selectedMonths.length === 0 || selectedMonths.includes(month);
      const isHighlighted = selectedMonths?.length === 1 && isSelected;
      return (
        <circle
          cx={cx}
          cy={cy}
          r={isHighlighted ? 5 : 3}
          fill={fill}
          opacity={isSelected ? 1 : 0.15}
          stroke="none"
        />
      );
    }
    return DotRenderer;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="h-[300px] sm:h-[360px] md:h-[420px] lg:h-[460px] min-w-[520px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 60, bottom: 50, left: 20 }}
              barGap={2}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

              <XAxis
                dataKey="monthName"
                interval={0}
                tickFormatter={localMonthName}
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                label={{
                  value: t("chart.monthAxis"),
                  position: "insideBottom",
                  offset: -10,
                  fill: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              />

              <YAxis
                yAxisId="temp"
                domain={scales ? [scales.tempMin, scales.tempMax] : ["auto", "auto"]}
                tickFormatter={(v: unknown) => String(Math.round(Number(v)))}
                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                label={{
                  value: "°C",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fill: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              />

              <YAxis
                yAxisId="prec"
                orientation="right"
                domain={[0, rightMax]}
                allowDataOverflow={false}
                tickFormatter={(v: unknown) => String(Math.round(Number(v)))}
                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                label={{
                  value: "mm",
                  angle: 90,
                  position: "insideRight",
                  offset: 12,
                  fill: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
                labelFormatter={localMonthName}
                formatter={(value, name) => {
                  const num = Number(value ?? "");
                  const formatted = isNaN(num) ? String(value ?? "") : num.toFixed(2);
                  const isPrecip = String(name).includes(t("chart.precipitation"));
                  return [isPrecip ? `${formatted} mm` : `${formatted} °C`, name];
                }}
              />

              <Legend
                verticalAlign="bottom"
                height={52}
                content={() => <CompareModeLegend labelA={labelA} labelB={labelB} />}
              />

              {visible.prec && (
                <Bar
                  yAxisId="prec"
                  dataKey="precA"
                  name={`${labelA ?? ""} — ${t("chart.precipitation")}`}
                  fill={CHART_COLORS.compareA.prec}
                  minPointSize={0}
                  background={false}
                  shape={
                    <PrecipBarShape
                      selectedMonths={selectedMonths}
                      aridityByMonth={showAridity ? aridityByMonthA : undefined}
                    />
                  }
                />
              )}

              {visible.tmax && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tmaxA"
                  name={`${labelA ?? ""} — ${t("chart.maxTemperature")}`}
                  stroke={CHART_COLORS.compareA.tmax}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareA.tmax)}
                  activeDot={{ r: 4 }}
                />
              )}

              {visible.tavg && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tavgA"
                  name={`${labelA ?? ""} — ${t("chart.avgTemperature")}`}
                  stroke={CHART_COLORS.compareA.tavg}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareA.tavg)}
                  activeDot={{ r: 4 }}
                  strokeDasharray="5 3"
                />
              )}

              {visible.tmin && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tminA"
                  name={`${labelA ?? ""} — ${t("chart.minTemperature")}`}
                  stroke={CHART_COLORS.compareA.tmin}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareA.tmin)}
                  activeDot={{ r: 4 }}
                  strokeDasharray="4 2"
                />
              )}

              {visible.prec && (
                <Bar
                  yAxisId="prec"
                  dataKey="precB"
                  name={`${labelB ?? ""} — ${t("chart.precipitation")}`}
                  fill={CHART_COLORS.compareB.prec}
                  minPointSize={0}
                  background={false}
                  shape={<PrecipBarShape selectedMonths={selectedMonths} />}
                />
              )}

              {visible.tmax && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tmaxB"
                  name={`${labelB ?? ""} — ${t("chart.maxTemperature")}`}
                  stroke={CHART_COLORS.compareB.tmax}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareB.tmax)}
                  activeDot={{ r: 4 }}
                />
              )}

              {visible.tavg && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tavgB"
                  name={`${labelB ?? ""} — ${t("chart.avgTemperature")}`}
                  stroke={CHART_COLORS.compareB.tavg}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareB.tavg)}
                  activeDot={{ r: 4 }}
                  strokeDasharray="5 3"
                />
              )}

              {visible.tmin && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tminB"
                  name={`${labelB ?? ""} — ${t("chart.minTemperature")}`}
                  stroke={CHART_COLORS.compareB.tmin}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.compareB.tmin)}
                  activeDot={{ r: 4 }}
                  strokeDasharray="4 2"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      {visible.prec && showAridity && <AridityLegend />}
    </>
  );
}
