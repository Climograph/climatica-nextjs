"use client";

import { CellSizeSelector, FilterChip, SectionLabel, YearInput } from "@/components";
import { Button, CollapsibleSection, Dropdown, ToggleSwitch } from "@/components/UI";
import {
  CELL_SIZE_OPTIONS,
  CELL_SIZES,
  CLIMATE_PERIOD_LABELS,
  CLIMATE_PERIODS,
  CLIMATE_VARIABLES,
  DATASETS,
  MAX_PERIODS,
  MIN_PERIODS,
  PERIOD_COLORS,
  PERIOD_RESTRICTED_VARIABLES,
  ROUTES,
  SIDEBAR_PARAMS,
  WEATHER_MAX_YEAR,
  WEATHER_MIN_YEAR,
  WEATHER_VARIABLES,
} from "@/constants";
import { EButtonVariant } from "@/enums";
import { useAutoScroll, usePersistedPeriods } from "@/hooks";
import { usePathname } from "@/libs/I18nNavigation";
import { useFiltersStore } from "@/stores";
import type { TCellSize, TCellSizeOption } from "@/types";
import { estimateCellCount, getCellCountStatus } from "@/utils";
import { sidebarFiltersSchema } from "@/validators";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TDraftErrors, TDraftFilters, TSidebarProps } from "./Sidebar.type";

const CLIMATE_PERIOD_OPTIONS = Object.values(CLIMATE_PERIODS).map((period) => ({
  value: period,
  label: CLIMATE_PERIOD_LABELS[period],
}));

export function Sidebar({ isOpen, onClose }: TSidebarProps) {
  const { autoScroll, toggleAutoScroll } = useAutoScroll();
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const {
    dataset,
    climatePeriod,
    weatherYear,
    variables,
    gridSize,
    months,
    syncCity,
    setSyncCity,
    actions: {
      setDataset,
      setClimatePeriod,
      setWeatherYear,
      toggleVariable,
      setGridSize,
      setMonths,
    },
  } = useFiltersStore();

  const [draft, setDraft] = useState<TDraftFilters>(() => ({
    dataset,
    climatePeriod,
    weatherYear,
    variables,
    gridSize,
    months,
  }));

  const [mounted, setMounted] = useState(false);
  const isComparePeriods = pathname.startsWith(ROUTES.COMPARE_PERIODS);
  const [periods, setPeriods] = usePersistedPeriods();
  const [addPeriodYear, setAddPeriodYear] = useState<number | undefined>(undefined);
  const [addPeriodError, setAddPeriodError] = useState<string | null>(null);
  const [errors, setErrors] = useState<TDraftErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const state = useFiltersStore.getState();
    setMounted(true);
    setDraft({
      dataset: state.dataset,
      climatePeriod: state.climatePeriod,
      weatherYear: state.weatherYear,
      variables: [...state.variables],
      gridSize: state.gridSize,
      months: state.months,
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setDraft({
        dataset,
        climatePeriod,
        weatherYear,
        variables: [...variables],
        gridSize,
        months,
      });
      setErrors({});
      setSubmitAttempted(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const isHeatmapPage = pathname.startsWith(ROUTES.HEAT_MAP);

  const northRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_NORTH);
  const southRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_SOUTH);
  const westRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_WEST);
  const eastRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_EAST);
  const heatmapBbox =
    northRaw !== null && southRaw !== null && westRaw !== null && eastRaw !== null
      ? {
          north: Number(northRaw),
          south: Number(southRaw),
          west: Number(westRaw),
          east: Number(eastRaw),
        }
      : null;

  const cellCount =
    isHeatmapPage && heatmapBbox !== null ? estimateCellCount(heatmapBbox, draft.gridSize) : null;
  const cellStatus = cellCount !== null ? getCellCountStatus(cellCount) : null;
  const isTooMany = cellCount !== null && cellCount > 10_000;

  const thirtySecDisabled =
    draft.dataset === DATASETS.WEATHER ||
    (draft.dataset === DATASETS.CLIMATE && draft.climatePeriod !== CLIMATE_PERIODS.C1970_2000);

  const cellSizeOptions: readonly TCellSizeOption[] = (
    Object.keys(CELL_SIZE_OPTIONS) as TCellSize[]
  ).map((value) => ({
    value,
    label: t(`cellSizes.${value.replace(".", "_")}`),
    ...(value === CELL_SIZES.THIRTY_SECONDS && thirtySecDisabled ? { disabled: true } : {}),
  }));

  function handleDraftDatasetChange(ds: (typeof DATASETS)[keyof typeof DATASETS]) {
    setDraft((prev) => {
      const variables =
        ds === DATASETS.WEATHER
          ? prev.variables.filter((v) => (WEATHER_VARIABLES as readonly string[]).includes(v))
          : prev.variables;
      const gridSize =
        ds === DATASETS.WEATHER && prev.gridSize === CELL_SIZES.THIRTY_SECONDS
          ? CELL_SIZES.TWO_POINT_FIVE_MINUTES
          : prev.gridSize;
      return { ...prev, dataset: ds, variables, gridSize };
    });
  }

  function handleDraftClimatePeriodChange(value: string) {
    const period = Object.values(CLIMATE_PERIODS).find((p) => p === value);
    if (period === undefined) return;
    if (period === CLIMATE_PERIODS.C1970_2000) {
      setDraft((prev) => ({ ...prev, climatePeriod: period }));
      return;
    }
    const restricted = new Set<string>(PERIOD_RESTRICTED_VARIABLES);
    setDraft((prev) => {
      const variables = prev.variables.filter((v) => !restricted.has(v));
      const gridSize =
        prev.gridSize === CELL_SIZES.THIRTY_SECONDS
          ? CELL_SIZES.TWO_POINT_FIVE_MINUTES
          : prev.gridSize;
      return { ...prev, climatePeriod: period, variables, gridSize };
    });
  }

  function handleDraftYearChange(year: number) {
    setDraft((prev) => ({ ...prev, weatherYear: year }));
    if (submitAttempted && errors["weatherYear"] !== undefined) {
      setErrors({});
    }
  }

  function handleDraftVariableToggle(v: string) {
    setDraft((prev) => ({
      ...prev,
      variables: prev.variables.includes(v as (typeof prev.variables)[number])
        ? prev.variables.filter((x) => x !== v)
        : ([...prev.variables, v] as typeof prev.variables),
    }));
  }

  function handleDraftGridSizeChange(size: TCellSize) {
    setDraft((prev) => ({ ...prev, gridSize: size }));
  }

  function handleDraftMonthToggle(month: number) {
    setDraft((prev) => {
      const current = prev.months === "all" ? [] : prev.months;
      const next = current.includes(month)
        ? current.filter((m) => m !== month)
        : [...current, month];
      return { ...prev, months: next.length === 0 ? "all" : next };
    });
  }

  function handleDraftSelectAllMonths() {
    setDraft((prev) => ({ ...prev, months: "all" }));
  }

  function handleAddPeriod() {
    if (
      addPeriodYear === undefined ||
      isNaN(addPeriodYear) ||
      addPeriodYear < WEATHER_MIN_YEAR ||
      addPeriodYear > WEATHER_MAX_YEAR
    ) {
      setAddPeriodError(
        t("comparePeriods.weather.invalidYear", { min: WEATHER_MIN_YEAR, max: WEATHER_MAX_YEAR }),
      );
      return;
    }
    if (periods.includes(addPeriodYear)) {
      setAddPeriodError(t("comparePeriods.weather.duplicateYear"));
      return;
    }
    if (periods.length >= MAX_PERIODS) return;
    setAddPeriodError(null);
    setPeriods([...periods, addPeriodYear]);
    setAddPeriodYear(undefined);
  }

  function handleRemovePeriod(year: number) {
    if (periods.length <= MIN_PERIODS) return;
    setPeriods(periods.filter((y) => y !== year));
  }

  function handleApplyAndClose() {
    setSubmitAttempted(true);

    const result = sidebarFiltersSchema.safeParse({
      dataset: draft.dataset,
      climatePeriod: draft.climatePeriod,
      weatherYear: draft.weatherYear,
    });

    if (!result.success) {
      const fieldErrors: TDraftErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = t(err.message, {
            min: WEATHER_MIN_YEAR,
            max: WEATHER_MAX_YEAR,
          });
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setDataset(draft.dataset);
    setClimatePeriod(draft.climatePeriod);
    setWeatherYear(result.data.weatherYear);
    draft.variables.forEach((v) => {
      if (!variables.includes(v)) toggleVariable(v);
    });
    variables.forEach((v) => {
      if (!draft.variables.includes(v)) toggleVariable(v);
    });
    setGridSize(draft.gridSize);
    setMonths(draft.months);

    void queryClient.invalidateQueries({ queryKey: ["climate"] });
    void queryClient.invalidateQueries({ queryKey: ["compare"] });
    void queryClient.invalidateQueries({ queryKey: ["compare-periods"] });
    void queryClient.invalidateQueries({ queryKey: ["heatmap"] });
    void queryClient.invalidateQueries({ queryKey: ["heatmap-polygon"] });

    setSubmitAttempted(false);
    setErrors({});
    onClose();
  }

  const isAllActive = draft.months === "all";

  return (
    <aside
      className={`
        flex w-64 shrink-0 flex-col overflow-hidden
        border-r border-[var(--color-border)] bg-[var(--color-bg)]
        fixed bottom-0 left-0 top-16 z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:top-auto lg:bottom-auto lg:z-auto lg:translate-x-0 lg:w-80
      `}
    >
      <div className="flex flex-1 flex-col overflow-y-auto p-4 gap-y-8">
        <CollapsibleSection title={t("sidebar.filters")} defaultOpen={true}>
          {/* Dataset */}
          <div>
            <SectionLabel text={t("sidebar.sections.dataset")} />
            <div className="flex flex-wrap gap-2">
              {Object.values(DATASETS).map((ds) => (
                <FilterChip
                  key={ds}
                  label={t(`sidebar.datasets.${ds}`)}
                  isActive={mounted && draft.dataset === ds}
                  onClick={() => handleDraftDatasetChange(ds)}
                />
              ))}
            </div>
          </div>

          {/* Climate Period */}
          {mounted && draft.dataset === DATASETS.CLIMATE && (
            <div>
              <SectionLabel text={t("sidebar.sections.climatePeriod")} />
              <Dropdown
                options={CLIMATE_PERIOD_OPTIONS}
                value={draft.climatePeriod}
                onChange={handleDraftClimatePeriodChange}
                className="w-full"
              />
              <p className="mt-1.5 text-[length:var(--font-xs)] text-[var(--color-text-secondary)]">
                {t("sidebar.notes.climateNormals")}
              </p>
            </div>
          )}

          {/* Weather Year */}
          {mounted && draft.dataset === DATASETS.WEATHER && (
            <div className="flex flex-col gap-2">
              <SectionLabel text={t("sidebar.sections.yearRange")} />
              {isComparePeriods ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {periods.map((year, i) => {
                      const color = PERIOD_COLORS[i] ?? PERIOD_COLORS[0];
                      return (
                        <span
                          key={year}
                          className="inline-flex items-center gap-1.5 rounded-[20px] border-l-2 bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-text)]"
                          style={{ borderLeftColor: color }}
                        >
                          <span style={{ color }}>●</span>
                          <span style={{ color }}>{year}</span>
                          {periods.length > MIN_PERIODS && (
                            <button
                              type="button"
                              onClick={() => handleRemovePeriod(year)}
                              className="ml-0.5 opacity-60 hover:opacity-100 leading-none text-[var(--color-text-secondary)]"
                              aria-label={t("comparePeriods.weather.removePeriod", { year })}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <YearInput
                        value={addPeriodYear}
                        min={WEATHER_MIN_YEAR}
                        max={WEATHER_MAX_YEAR}
                        onChange={(year) => {
                          setAddPeriodYear(year);
                          setAddPeriodError(null);
                        }}
                        onEnter={handleAddPeriod}
                        placeholder={`${WEATHER_MIN_YEAR}–${WEATHER_MAX_YEAR}`}
                        disabled={periods.length >= MAX_PERIODS}
                      />
                    </div>
                    <Button
                      variant={EButtonVariant.SECONDARY}
                      onClick={handleAddPeriod}
                      disabled={periods.length >= MAX_PERIODS}
                      className="shrink-0 px-3 py-2 text-[length:var(--font-base)]"
                    >
                      {t("comparePeriods.weather.addPeriod")}
                    </Button>
                  </div>
                  <p className="text-[length:var(--font-xs)] text-[var(--color-text-secondary)]">
                    {t("comparePeriods.weather.periodsCount", {
                      count: periods.length,
                      max: MAX_PERIODS,
                    })}
                  </p>
                  {addPeriodError && (
                    <p className="text-[length:var(--font-xs)] text-[var(--color-error)]">
                      {addPeriodError}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <YearInput
                    value={draft.weatherYear}
                    min={WEATHER_MIN_YEAR}
                    max={WEATHER_MAX_YEAR}
                    onChange={handleDraftYearChange}
                    placeholder={`${WEATHER_MIN_YEAR}–${WEATHER_MAX_YEAR}`}
                  />
                  {errors["weatherYear"] !== undefined && errors["weatherYear"] !== "" && (
                    <span className="text-[length:var(--font-xs)] font-medium text-[var(--color-error)]">
                      {errors["weatherYear"]}
                    </span>
                  )}
                  <p className="text-[length:var(--font-xs)] text-[var(--color-text-secondary)]">
                    {t("sidebar.notes.weatherData")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Variables */}
          <div>
            <SectionLabel text={t("sidebar.sections.variables")} />
            <div className="flex flex-wrap gap-2">
              {(mounted && draft.dataset === DATASETS.WEATHER
                ? WEATHER_VARIABLES
                : CLIMATE_VARIABLES
              ).map((v) => {
                const isRestricted =
                  mounted &&
                  draft.dataset === DATASETS.CLIMATE &&
                  (PERIOD_RESTRICTED_VARIABLES as readonly string[]).includes(v) &&
                  (draft.climatePeriod !== CLIMATE_PERIODS.C1970_2000 || isHeatmapPage);

                return (
                  <FilterChip
                    key={v}
                    label={t(`sidebar.variables.${v}`)}
                    isActive={draft.variables.includes(v)}
                    disabled={isRestricted}
                    onClick={() => handleDraftVariableToggle(v)}
                  />
                );
              })}
            </div>
            {draft.dataset === DATASETS.WEATHER && (
              <p className="mt-1.5 text-[length:var(--font-xs)] text-[var(--color-text-secondary)]">
                {t("sidebar.notes.weatherVariables")}
              </p>
            )}
            {isHeatmapPage && draft.dataset === DATASETS.CLIMATE && (
              <p className="mt-1.5 text-[11px] italic text-[var(--color-text-secondary)]">
                {t("sidebar.notes.notAvailableHeatmap")}
              </p>
            )}
          </div>

          {/* Grid resolution */}
          <div>
            <CellSizeSelector
              activeSize={draft.gridSize}
              options={cellSizeOptions}
              onSelect={handleDraftGridSizeChange}
            />
            {isHeatmapPage && cellStatus !== null && cellCount !== null && (
              <div className="mt-2 flex flex-col gap-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[length:var(--font-xs)] font-medium ${cellStatus.colorClass}`}
                >
                  {t(cellStatus.labelKey)}
                  <span className="opacity-70">({cellCount.toLocaleString()} cells)</span>
                </span>
                {isTooMany && (
                  <p className="text-[length:var(--font-xs)] text-[var(--color-error)]">
                    {t("sidebar.cellCount.tooManyError")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Months */}
          <div className={isHeatmapPage ? "pointer-events-none opacity-40" : ""}>
            <SectionLabel text={t("sidebar.sections.months")} />
            {isHeatmapPage && (
              <p className="mb-1.5 text-[11px] italic text-[var(--color-text-secondary)]">
                {t("sidebar.notes.notAvailableHeatmap")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label={t("sidebar.months.all")}
                isActive={isAllActive}
                onClick={handleDraftSelectAllMonths}
              />
              {Array.from({ length: 12 }, (_, i) => {
                const monthNum = i + 1;
                const isActive = !isAllActive && (draft.months as number[]).includes(monthNum);
                return (
                  <FilterChip
                    key={monthNum}
                    label={t(`months.${monthNum}`)}
                    isActive={isActive}
                    onClick={() => handleDraftMonthToggle(monthNum)}
                  />
                );
              })}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t("sidebar.settings")}
          defaultOpen={false}
          withDivider
          gapBetweenOptions="gap-2"
        >
          <ToggleSwitch
            label={t("sidebar.autoScroll")}
            checked={autoScroll}
            onChange={toggleAutoScroll}
          />
          <ToggleSwitch
            label={t("sidebar.syncCity")}
            checked={syncCity}
            onChange={() => setSyncCity(!syncCity)}
          />
        </CollapsibleSection>
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] p-4">
        <Button
          variant={EButtonVariant.PRIMARY}
          onClick={handleApplyAndClose}
          disabled={isTooMany}
          className="w-full py-2 text-[length:var(--font-base)]"
        >
          {t("sidebar.applyFilters")}
        </Button>
      </div>
    </aside>
  );
}
