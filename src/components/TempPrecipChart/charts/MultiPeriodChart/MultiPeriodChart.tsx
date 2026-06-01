import { MONTH_NAMES } from "@/constants";
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
import type { TDotRendererProps } from "../../TempPrecipChart.type";
import type { TMultiPeriodChartProps } from "./MultiPeriodChart.type";

function periodColor(i: number, colors: readonly string[] | undefined): string {
  return colors?.[i] ?? `var(--color-period-${i})`;
}

function MultiPeriodLegend({
  periods,
  periodColors: colors,
  hiddenPeriods,
}: {
  periods: { year: number }[];
  periodColors: readonly string[] | undefined;
  hiddenPeriods: number[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-3" style={{ fontSize: 11 }}>
      {periods.map(({ year }, i) => {
        const color = periodColor(i, colors);
        const isHidden = hiddenPeriods.includes(year);
        return (
          <span
            key={year}
            className="flex items-center gap-1.5 transition-opacity"
            style={{ opacity: isHidden ? 0.35 : 1 }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span style={{ color }}>{year}</span>
          </span>
        );
      })}
    </div>
  );
}

export function MultiPeriodChart({
  chartData,
  multiPeriodData,
  visible,
  scales,
  rightMax,
  selectedMonths,
  periodColors,
  hiddenPeriods = [],
}: TMultiPeriodChartProps) {
  const t = useTranslations();

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
              height={36}
              content={() => (
                <MultiPeriodLegend
                  periods={multiPeriodData}
                  periodColors={periodColors}
                  hiddenPeriods={hiddenPeriods}
                />
              )}
            />

            {multiPeriodData.flatMap(({ year }, i) => {
              const color = periodColor(i, periodColors);
              const hidden = hiddenPeriods.includes(year);
              const series = [];
              if (visible.prec) {
                series.push(
                  <Bar
                    key={`bar-${year}`}
                    yAxisId="prec"
                    dataKey={`${year}_prec`}
                    name={`${year} — ${t("chart.precipitation")}`}
                    fill={color}
                    minPointSize={0}
                    hide={hidden}
                    shape={<PrecipBarShape selectedMonths={selectedMonths} />}
                  />,
                );
              }
              if (visible.tmax) {
                series.push(
                  <Line
                    key={`line-tmax-${year}`}
                    yAxisId="temp"
                    type="monotone"
                    dataKey={`${year}_tmax`}
                    name={`${year} — ${t("chart.maxTemperature")}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={makeDot(color)}
                    activeDot={{ r: 4 }}
                    hide={hidden}
                  />,
                );
              }
              if (visible.tmin) {
                series.push(
                  <Line
                    key={`line-tmin-${year}`}
                    yAxisId="temp"
                    type="monotone"
                    dataKey={`${year}_tmin`}
                    name={`${year} — ${t("chart.minTemperature")}`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={makeDot(color)}
                    activeDot={{ r: 3 }}
                    hide={hidden}
                  />,
                );
              }
              return series;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
