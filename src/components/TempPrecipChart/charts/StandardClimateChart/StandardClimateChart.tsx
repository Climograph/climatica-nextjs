import { ClimateStatsBar } from "@/components";
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
import type { TStandardClimateChartProps } from "./StandardClimateChart.type";

export function StandardClimateChart({
  chartData,
  aridity,
  scales,
  rightMax,
  summary,
  visible,
  selectedMonths,
  altitude,
  showAridity = true,
}: TStandardClimateChartProps) {
  const t = useTranslations();

  const aridityByMonth = useMemo<Record<number, boolean> | undefined>(() => {
    if (!aridity) return undefined;
    return Object.fromEntries(aridity.map((m) => [m.month, m.isArid]));
  }, [aridity]);

  function localMonthName(v: unknown): string {
    const idx = (MONTH_NAMES as readonly string[]).indexOf(String(v));
    return idx >= 0 ? t(`months.${idx + 1}`) : String(v);
  }

  function makeDot(color: string) {
    function DotRenderer(dotProps: TDotRendererProps) {
      const { cx = 0, cy = 0, fill = color, index = -1 } = dotProps;
      const month = aridity?.[index]?.month ?? (index >= 0 ? index + 1 : -1);
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
      {summary && (
        <ClimateStatsBar
          meanTemp={summary.annualAvgTemp}
          annualPrecip={summary.totalPrec}
          aridMonths={summary.aridCount}
          martonneIndex={summary.martonne}
          {...(altitude !== undefined ? { altitude } : {})}
        />
      )}
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

              <Legend verticalAlign="bottom" height={48} wrapperStyle={{ paddingTop: 24 }} />

              {visible.prec && (
                <Bar
                  yAxisId="prec"
                  dataKey="prec"
                  name={t("chart.precipitation")}
                  fill={CHART_COLORS.humid}
                  minPointSize={0}
                  background={false}
                  shape={
                    <PrecipBarShape
                      selectedMonths={selectedMonths}
                      aridityByMonth={showAridity ? aridityByMonth : undefined}
                    />
                  }
                />
              )}

              {visible.tmax && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tmax"
                  name={t("chart.maxTemperature")}
                  stroke={CHART_COLORS.single.tmax}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.single.tmax)}
                  activeDot={{ r: 5 }}
                />
              )}

              {visible.tavg && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tavg"
                  name={t("chart.avgTemperature")}
                  stroke={CHART_COLORS.single.tavg}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={makeDot(CHART_COLORS.single.tavg)}
                  activeDot={{ r: 5 }}
                />
              )}

              {visible.tmin && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tmin"
                  name={t("chart.minTemperature")}
                  stroke={CHART_COLORS.single.tmin}
                  strokeWidth={2}
                  dot={makeDot(CHART_COLORS.single.tmin)}
                  activeDot={{ r: 5 }}
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
