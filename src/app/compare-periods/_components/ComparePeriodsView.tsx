"use client";

import type { TMiniMapLocation } from "@/components";
import {
  CompareStatsGrid,
  DiffCard,
  LocationSearch,
  MultiPeriodStatsTable,
  TempPrecipChart,
} from "@/components";
import {
  ChartSkeleton,
  DotLabel,
  Dropdown,
  EmptyState,
  ErrorBanner,
  ExportMenu,
  MapSkeleton,
  PageTitle,
  PageWrapper,
  TableSkeleton,
} from "@/components/UI";
import {
  CELL_SIZE_OPTIONS,
  CLIMATE_COMPARISON_COLORS,
  CLIMATE_PERIOD_LABELS,
  CLIMATE_PERIODS,
  DATASETS,
  PERIOD_COLORS,
} from "@/constants";
import type { TClimatePeriod } from "@/types";
import {
  buildClimateStatsRows,
  buildFilename,
  exportElementToPng,
  exportTableToCsv,
  getMartonneBadge,
} from "@/utils";
import { computeCompareStats } from "@/utils/climateComparison.util";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRef } from "react";
import type { TClimatePeriodRowProps, TComparePeriodsViewProps } from "./ComparePeriods.type";

const MiniMap = dynamic(
  () => import("@/components/UI/MiniMap/MiniMap").then((m) => ({ default: m.MiniMap })),
  {
    ssr: false,
    loading: () => <MapSkeleton variant="mini" />,
  },
);

const CLIMATE_PERIOD_OPTIONS = Object.values(CLIMATE_PERIODS).map((period) => ({
  value: period,
  label: CLIMATE_PERIOD_LABELS[period],
}));

function ClimatePeriodRow({ label, dotColor, value, onChange }: TClimatePeriodRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <DotLabel label={label} dotColor={dotColor} />
      <Dropdown
        options={CLIMATE_PERIOD_OPTIONS}
        value={value}
        onChange={(v) => {
          const period = Object.values(CLIMATE_PERIODS).find((p) => p === v);
          if (period) onChange(period as TClimatePeriod);
        }}
      />
    </div>
  );
}

export function ComparePeriodsView({
  city,
  dataset,
  isHydrated,
  climatePeriodA,
  climatePeriodB,
  dataA,
  dataB,
  autoGrid,
  selectedMonths,
  altitude,
  isLoading,
  isLocating,
  error,
  locationError,
  onCitySelect,
  onLocate,
  onClearLocationError,
  onClimatePeriodAChange,
  onClimatePeriodBChange,
  periods,
  periodsData,
  loadingPeriods,
  chartSectionRef,
}: TComparePeriodsViewProps) {
  const t = useTranslations();
  const climateExportRef = useRef<HTMLDivElement>(null);
  const weatherExportRef = useRef<HTMLDivElement>(null);

  const isClimate = dataset === DATASETS.CLIMATE;

  const labelA = isClimate ? CLIMATE_PERIOD_LABELS[climatePeriodA] : String(periods[0] ?? "");
  const labelB = isClimate ? CLIMATE_PERIOD_LABELS[climatePeriodB] : String(periods[1] ?? "");

  const hasBothClimateData = dataA.length > 0 && dataB.length > 0;
  const statsA = hasBothClimateData ? computeCompareStats(dataA) : null;
  const statsB = hasBothClimateData ? computeCompareStats(dataB) : null;
  const tmaxDiff = statsA && statsB ? statsB.avgTmax - statsA.avgTmax : null;
  const precDiff = statsA && statsB ? statsB.totalPrec - statsA.totalPrec : null;

  const miniMapLocations: TMiniMapLocation[] = [
    { lat: city.lat, lng: city.lng, label: city.label, color: CLIMATE_COMPARISON_COLORS.A.tmax },
  ];

  function handleClimateExportCSV() {
    if (!statsA || !statsB) return;
    const badgeA = getMartonneBadge(statsA.martonneIndex);
    const badgeB = getMartonneBadge(statsB.martonneIndex);
    const rows = buildClimateStatsRows(
      [statsA, statsB],
      [
        t("climateComparison.stats.avgTmax"),
        t("climateComparison.stats.avgTmin"),
        t("climateComparison.stats.totalPrec"),
        t("climateComparison.stats.aridMonths"),
      ],
    );
    if (altitude != null) {
      rows.push([t("chart.altitude"), `${altitude} m`, `${altitude} m`]);
    }
    rows.push([
      t("climateComparison.stats.martonne"),
      statsA.martonneIndex !== null
        ? `${statsA.martonneIndex.toFixed(1)} (${badgeA?.labelKey ?? ""})`
        : "—",
      statsB.martonneIndex !== null
        ? `${statsB.martonneIndex.toFixed(1)} (${badgeB?.labelKey ?? ""})`
        : "—",
    ]);
    exportTableToCsv(
      buildFilename("compare-periods", [city.label, labelA, labelB], "csv"),
      [t("exportMenu.metricColumn"), labelA, labelB],
      rows,
    );
  }

  async function handleClimateExportPNG() {
    if (!climateExportRef.current) return;
    await exportElementToPng(
      climateExportRef.current,
      buildFilename("compare-periods", [city.label, labelA, labelB], "png"),
    );
  }

  function handleWeatherExportCSV() {
    const statsMap = new Map(
      periodsData.map(({ year, rows }) => [year, computeCompareStats(rows)]),
    );
    const rows = buildClimateStatsRows(
      periods.map((year) => statsMap.get(year)),
      [
        t("climateComparison.stats.avgTmax"),
        t("climateComparison.stats.avgTmin"),
        t("climateComparison.stats.totalPrec"),
        t("climateComparison.stats.aridMonths"),
      ],
    );
    if (altitude !== null) {
      rows.push([t("chart.altitude"), ...periods.map(() => `${altitude} m`)]);
    }
    rows.push([
      t("climateComparison.stats.martonne"),
      ...periods.map((year) => {
        const s = statsMap.get(year);
        return s !== undefined && s.martonneIndex !== null ? s.martonneIndex.toFixed(1) : "—";
      }),
    ]);
    exportTableToCsv(
      buildFilename("compare-periods", [city.label, ...periods.map(String)], "csv"),
      [t("exportMenu.metricColumn"), ...periods.map(String)],
      rows,
    );
  }

  async function handleWeatherExportPNG() {
    if (!weatherExportRef.current) return;
    await exportElementToPng(
      weatherExportRef.current,
      buildFilename("compare-periods", [city.label, ...periods.map(String)], "png"),
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-10">
        <header className="text-center">
          <PageTitle suppressHydrationWarning>{t("comparePeriods.title")}</PageTitle>
        </header>

        <p
          className="text-center text-[length:var(--font-xs)] text-[var(--color-text-secondary)]"
          suppressHydrationWarning
        >
          {t("climateComparison.autoResolution", { resolution: CELL_SIZE_OPTIONS[autoGrid] })}
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <DotLabel
                label={t("climateComparison.searchCity")}
                dotColor={CLIMATE_COMPARISON_COLORS.A.tmax}
              />
              <LocationSearch
                key={city.id}
                defaultValue={city.label}
                isLocating={isLocating}
                locationError={locationError}
                onCitySelect={onCitySelect}
                onLocate={onLocate}
                onClearLocationError={onClearLocationError}
              />
            </div>

            {isHydrated && isClimate && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ClimatePeriodRow
                  label={t("climateComparison.periodA")}
                  dotColor={CLIMATE_COMPARISON_COLORS.A.tmax}
                  value={climatePeriodA}
                  onChange={onClimatePeriodAChange}
                />
                <ClimatePeriodRow
                  label={t("climateComparison.periodB")}
                  dotColor={CLIMATE_COMPARISON_COLORS.B.tmax}
                  value={climatePeriodB}
                  onChange={onClimatePeriodBChange}
                />
              </div>
            )}
          </div>
          {city?.lat && city?.lng && (
            <MiniMap locations={miniMapLocations} activeIndex={0} onToggle={() => undefined} />
          )}{" "}
        </div>

        {error && !isLoading && <ErrorBanner message={error.message} />}

        {isClimate &&
          (isLoading ? (
            <div className="flex flex-col gap-2">
              <div className="flex h-10 items-center justify-end">
                <div className="h-8 w-28 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border)]" />
              </div>
              <div className="flex flex-col gap-6">
                <TableSkeleton rows={5} cols={2} />
                <ChartSkeleton />
              </div>
            </div>
          ) : hasBothClimateData && statsA && statsB ? (
            <div ref={chartSectionRef} className="flex flex-col gap-2">
              <div className="flex h-10 items-center justify-end">
                <ExportMenu
                  onExportCSV={handleClimateExportCSV}
                  onExportPNG={handleClimateExportPNG}
                />
              </div>
              <div ref={climateExportRef} className="flex flex-col gap-6">
                <CompareStatsGrid
                  labelA={labelA}
                  labelB={labelB}
                  statsA={statsA}
                  statsB={statsB}
                  altitudeA={altitude}
                  altitudeB={altitude}
                />
                <TempPrecipChart
                  dataA={dataA}
                  dataB={dataB}
                  labelA={labelA}
                  labelB={labelB}
                  compareMode="periods"
                  cityName={city.label}
                  subtitle={{ rawLabel: `${labelA} vs ${labelB}` }}
                  showWalterLiethToggle={false}
                  showAridity={false}
                  {...(selectedMonths !== null && selectedMonths.length > 0
                    ? { selectedMonths }
                    : {})}
                />
              </div>
            </div>
          ) : !hasBothClimateData && !error ? (
            <EmptyState message={t("climateComparison.noDataPeriods")} />
          ) : null)}

        {isClimate && hasBothClimateData && tmaxDiff !== null && precDiff !== null && (
          <div className="grid grid-cols-2 gap-3">
            <DiffCard
              title={t("comparePeriods.trend.tempTitle")}
              value={
                tmaxDiff === 0
                  ? t("comparePeriods.trend.noChange")
                  : `${tmaxDiff > 0 ? "+" : ""}${tmaxDiff.toFixed(1)}°C`
              }
              sub={`${labelB} vs ${labelA}`}
              valueColor={
                tmaxDiff > 0
                  ? CLIMATE_COMPARISON_COLORS.B.tmax
                  : tmaxDiff < 0
                    ? CLIMATE_COMPARISON_COLORS.A.tmax
                    : undefined
              }
            />
            <DiffCard
              title={t("comparePeriods.trend.precipTitle")}
              value={
                precDiff === 0
                  ? t("comparePeriods.trend.noChange")
                  : `${precDiff > 0 ? "+" : ""}${precDiff.toFixed(0)} mm`
              }
              sub={`${labelB} vs ${labelA}`}
              valueColor={
                precDiff > 0
                  ? CLIMATE_COMPARISON_COLORS.B.tmax
                  : precDiff < 0
                    ? CLIMATE_COMPARISON_COLORS.A.tmax
                    : undefined
              }
            />
          </div>
        )}

        {/* ── Weather: multi-period ── */}
        {!isClimate && periods.length > 0 && (
          <div ref={chartSectionRef} className="flex flex-col gap-2">
            {periodsData.length > 0 ? (
              <div className="flex h-10 items-center justify-end">
                <ExportMenu
                  onExportCSV={handleWeatherExportCSV}
                  onExportPNG={handleWeatherExportPNG}
                />
              </div>
            ) : loadingPeriods.length > 0 ? (
              <div className="flex h-10 items-center justify-end">
                <div className="h-8 w-28 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border)]" />
              </div>
            ) : null}
            <div ref={weatherExportRef} className="flex flex-col gap-6">
              <MultiPeriodStatsTable
                periods={periods}
                periodsData={periodsData}
                loadingPeriods={loadingPeriods}
                altitude={altitude}
                periodColors={PERIOD_COLORS}
              />
              {periodsData.length > 0 ? (
                <TempPrecipChart
                  cityName={city.label}
                  multiPeriodData={periodsData}
                  periodColors={PERIOD_COLORS}
                  showWalterLiethToggle={false}
                  showAridity={false}
                  {...(selectedMonths !== null && selectedMonths.length > 0
                    ? { selectedMonths }
                    : {})}
                />
              ) : loadingPeriods.length > 0 ? (
                <ChartSkeleton />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
