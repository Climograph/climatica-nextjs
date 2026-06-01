"use client";

import type { TMiniMapLocation } from "@/components";
import { CompareStatsGrid, DiffCard, SearchBar, TempPrecipChart } from "@/components";
import {
  ChartSkeleton,
  DotLabel,
  EmptyState,
  ErrorBanner,
  ExportMenu,
  MapSkeleton,
  PageTitle,
  PageWrapper,
  TableSkeleton,
} from "@/components/UI";
import { CELL_SIZE_OPTIONS, CLIMATE_COMPARISON_COLORS } from "@/constants";
import {
  buildClimateStatsRows,
  buildFilename,
  exportElementToPng,
  exportTableToCsv,
  getMartonneLabelKey,
} from "@/utils";
import { computeCompareStats, computeDiffStats } from "@/utils/climateComparison.util";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { TCitySearchRowProps, TCompareCitiesViewProps } from "./CompareCities.type";

const MiniMap = dynamic(
  () => import("@/components/UI/MiniMap/MiniMap").then((m) => ({ default: m.MiniMap })),
  {
    ssr: false,
    loading: () => <MapSkeleton variant="mini" />,
  },
);

function CitySearchRow({ label, dotColor, defaultValue, onCitySelect }: TCitySearchRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <DotLabel label={label} dotColor={dotColor} />
      <SearchBar defaultValue={defaultValue} onCitySelect={onCitySelect} />
    </div>
  );
}

export function CompareCitiesView({
  cityA,
  cityB,
  dataA,
  dataB,
  autoGrid,
  subtitle,
  selectedMonths,
  isLoading,
  error,
  altitudeA,
  altitudeB,
  onCityASelect,
  onCityBSelect,
  chartSectionRef,
}: TCompareCitiesViewProps) {
  const t = useTranslations();
  const [activeCity, setActiveCity] = useState(0);
  const exportRef = useRef<HTMLDivElement>(null);

  const hasBothData = dataA.length > 0 && dataB.length > 0;
  const statsA = hasBothData ? computeCompareStats(dataA) : null;
  const statsB = hasBothData ? computeCompareStats(dataB) : null;
  const diff = hasBothData ? computeDiffStats(dataA, dataB) : null;

  const labelA = cityA.label;
  const labelB = cityB.label;

  const miniMapLocations: TMiniMapLocation[] = [
    ...(cityA?.lat && cityA?.lng
      ? [
          {
            lat: cityA.lat,
            lng: cityA.lng,
            label: cityA.label,
            color: CLIMATE_COMPARISON_COLORS.A.tmax,
          },
        ]
      : []),
    ...(cityB?.lat && cityB?.lng
      ? [
          {
            lat: cityB.lat,
            lng: cityB.lng,
            label: cityB.label,
            color: CLIMATE_COMPARISON_COLORS.B.tmax,
          },
        ]
      : []),
  ];

  function handleExportCSV() {
    if (!statsA || !statsB) return;
    const showAltitude = altitudeA != null || altitudeB != null;
    const rows = buildClimateStatsRows(
      [statsA, statsB],
      [
        t("climateComparison.stats.avgTmax"),
        t("climateComparison.stats.avgTmin"),
        t("climateComparison.stats.totalPrec"),
        t("climateComparison.stats.aridMonths"),
      ],
    );
    if (showAltitude) {
      rows.push([
        t("chart.altitude"),
        altitudeA != null ? `${altitudeA} m` : "—",
        altitudeB != null ? `${altitudeB} m` : "—",
      ]);
    }
    rows.push([
      t("climateComparison.stats.martonne"),
      statsA.martonneIndex !== null
        ? `${statsA.martonneIndex.toFixed(1)} (${t(getMartonneLabelKey(statsA.martonneIndex))})`
        : "—",
      statsB.martonneIndex !== null
        ? `${statsB.martonneIndex.toFixed(1)} (${t(getMartonneLabelKey(statsB.martonneIndex))})`
        : "—",
    ]);
    exportTableToCsv(
      buildFilename("compare-cities", [labelA, labelB], "csv"),
      [t("exportMenu.metricColumn"), labelA, labelB],
      rows,
    );
  }

  async function handleExportPNG() {
    if (!exportRef.current) return;
    await exportElementToPng(
      exportRef.current,
      buildFilename("compare-cities", [labelA, labelB], "png"),
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-10">
        <header className="text-center">
          <PageTitle suppressHydrationWarning>{t("compareCities.title")}</PageTitle>
        </header>

        <p
          className="text-center text-[length:var(--font-xs)] text-[var(--color-text-secondary)]"
          suppressHydrationWarning
        >
          {t("climateComparison.autoResolution", { resolution: CELL_SIZE_OPTIONS[autoGrid] })}
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CitySearchRow
                key={cityA.id}
                label={t("climateComparison.searchA")}
                dotColor={CLIMATE_COMPARISON_COLORS.A.tmax}
                defaultValue={cityA.label}
                onCitySelect={onCityASelect}
              />
              <CitySearchRow
                key={cityB.id}
                label={t("climateComparison.searchB")}
                dotColor={CLIMATE_COMPARISON_COLORS.B.tmax}
                defaultValue={cityB.label}
                onCitySelect={onCityBSelect}
              />
            </div>
          </div>

          <MiniMap locations={miniMapLocations} activeIndex={activeCity} onToggle={setActiveCity} />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-10 items-center justify-end">
              <div className="h-8 w-28 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border)]" />
            </div>
            <div className="flex flex-col gap-6">
              <TableSkeleton rows={5} cols={2} />
              <ChartSkeleton />
            </div>
          </div>
        ) : hasBothData && statsA && statsB ? (
          <div ref={chartSectionRef} className="flex flex-col gap-2">
            <div className="flex h-10 items-center justify-end">
              <ExportMenu onExportCSV={handleExportCSV} onExportPNG={handleExportPNG} />
            </div>
            <div ref={exportRef} className="flex flex-col gap-6">
              <CompareStatsGrid
                labelA={labelA}
                labelB={labelB}
                statsA={statsA}
                statsB={statsB}
                altitudeA={altitudeA}
                altitudeB={altitudeB}
                activeColumn={activeCity}
              />
              <TempPrecipChart
                dataA={dataA}
                dataB={dataB}
                labelA={labelA}
                labelB={labelB}
                compareMode="cities"
                cityName={`${labelA} vs ${labelB}`}
                subtitle={subtitle}
                showWalterLiethToggle={false}
                showAridity={false}
                {...(selectedMonths !== null && selectedMonths.length > 0
                  ? { selectedMonths }
                  : {})}
              />
            </div>
          </div>
        ) : null}

        {error && !isLoading && <ErrorBanner message={error.message} />}

        {!hasBothData && !isLoading && !error && (
          <EmptyState message={t("climateComparison.noData")} />
        )}

        {hasBothData && diff && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DiffCard
              title={t("climateComparison.diff.warmerCity")}
              value={
                diff.warmerCity === "tie"
                  ? t("climateComparison.diff.tie")
                  : diff.warmerCity === "A"
                    ? labelA
                    : labelB
              }
              sub={
                diff.warmerCity === "tie"
                  ? "="
                  : t("climateComparison.diff.byDegrees", { value: diff.tmaxDiff.toFixed(1) })
              }
              valueColor={
                diff.warmerCity === "A"
                  ? CLIMATE_COMPARISON_COLORS.A.tmax
                  : diff.warmerCity === "B"
                    ? CLIMATE_COMPARISON_COLORS.B.tmax
                    : undefined
              }
            />
            <DiffCard
              title={t("climateComparison.diff.moreRain")}
              value={
                diff.moreRainCity === "tie"
                  ? t("climateComparison.diff.tie")
                  : diff.moreRainCity === "A"
                    ? labelA
                    : labelB
              }
              sub={
                diff.moreRainCity === "tie"
                  ? "="
                  : t("climateComparison.diff.byMm", { value: diff.precDiff.toFixed(0) })
              }
              valueColor={
                diff.moreRainCity === "A"
                  ? CLIMATE_COMPARISON_COLORS.A.tmax
                  : diff.moreRainCity === "B"
                    ? CLIMATE_COMPARISON_COLORS.B.tmax
                    : undefined
              }
            />
            <DiffCard
              title={t("climateComparison.diff.hottestMonth")}
              value={diff.hottestMonthName}
              sub={`${labelA}: ${diff.hottestTempA.toFixed(1)}°C / ${labelB}: ${diff.hottestTempB.toFixed(1)}°C`}
            />
            <DiffCard
              title={t("climateComparison.diff.coldestMonth")}
              value={diff.coldestMonthName}
              sub={`${labelA}: ${diff.coldestTempA.toFixed(1)}°C / ${labelB}: ${diff.coldestTempB.toFixed(1)}°C`}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
