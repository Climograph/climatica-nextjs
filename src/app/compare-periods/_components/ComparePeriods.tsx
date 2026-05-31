"use client";

import {
  APP_TITLE,
  CLIMATE_PERIOD_LABELS,
  CLIMATE_PERIODS,
  DATASETS,
  MIN_PERIODS,
  SIDEBAR_PARAMS,
  TIME,
  VARIABLE_LABELS,
  WEATHER_MAX_YEAR,
  WEATHER_MIN_YEAR,
} from "@/constants";
import {
  useAutoScroll,
  useGeolocation,
  useGetAltitude,
  useGetComparePeriods,
  useGetMultiPeriodData,
  usePersistedCity,
  usePersistedComparisonCities,
  usePersistedPeriods,
} from "@/hooks";
import { usePathname, useRouter } from "@/libs/I18nNavigation";
import { useFiltersStore } from "@/stores";
import type { TClimatePeriod, TWikidataCity } from "@/types";
import {
  applyUrlFiltersToStore,
  cityFromUrl,
  createUrlParamHelpers,
  encodeMonths,
  encodePeriods,
  encodeVars,
  parsePeriod,
  parsePeriods,
  parseYear,
  scrollToSection,
} from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComparePeriodsView } from "./ComparePeriodsView";

function resolvePeriodFromUrl(raw: string | null, fallback: TClimatePeriod): TClimatePeriod {
  return parsePeriod(raw) ?? fallback;
}

export function ComparePeriods() {
  const { autoScroll } = useAutoScroll();
  const queryClient = useQueryClient();
  const userSelectedRef = useRef(false);
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const { city, selectCity: selectCityA } = usePersistedCity();
  const { selectCityA: selectCompareCityA } = usePersistedComparisonCities();
  const { gridSize, dataset, months, variables, syncCity, hasHydrated } = useFiltersStore();
  const { locate, isLocating, locationError, clearLocationError } = useGeolocation();
  const selectedMonths = Array.isArray(months) ? months : null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cityA = city;

  // * 2 climate periods
  const [climatePeriodA, setClimatePeriodA] = useState<TClimatePeriod>(() =>
    resolvePeriodFromUrl(searchParams.get(SIDEBAR_PARAMS.PERIOD_A), CLIMATE_PERIODS.C1970_2000),
  );
  const [climatePeriodB, setClimatePeriodB] = useState<TClimatePeriod>(() =>
    resolvePeriodFromUrl(searchParams.get(SIDEBAR_PARAMS.PERIOD_B), CLIMATE_PERIODS.C1991_2020),
  );

  const [periods, setPeriods] = usePersistedPeriods();

  useEffect(() => {
    const urlCity = cityFromUrl(
      searchParams.get(SIDEBAR_PARAMS.LAT),
      searchParams.get(SIDEBAR_PARAMS.LNG),
      searchParams.get(SIDEBAR_PARAMS.CITY),
    );
    if (urlCity) selectCityA(urlCity);

    applyUrlFiltersToStore(searchParams, useFiltersStore.getState().actions);

    const fromUrl = parsePeriods(searchParams.get(SIDEBAR_PARAMS.PERIODS));
    if (fromUrl !== null && fromUrl.length >= MIN_PERIODS) {
      setPeriods(fromUrl);
    } else {
      const y1 = parseYear(searchParams.get(SIDEBAR_PARAMS.YEAR_A));
      const y2 = parseYear(searchParams.get(SIDEBAR_PARAMS.YEAR_B));
      if (y1 !== null && y2 !== null) setPeriods([y1, y2]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const varsStr = useMemo(() => encodeVars(variables), [variables]);
  const monthsStr = useMemo(() => encodeMonths(months), [months]);
  const periodsStr = useMemo(() => encodePeriods(periods), [periods]);

  useEffect(() => {
    const helper = createUrlParamHelpers(searchParams);

    helper.set(SIDEBAR_PARAMS.CITY, cityA.label.trim());
    helper.set(SIDEBAR_PARAMS.LAT, cityA.lat.toFixed(4));
    helper.set(SIDEBAR_PARAMS.LNG, cityA.lng.toFixed(4));
    helper.set(SIDEBAR_PARAMS.DATASET, dataset);
    helper.set(SIDEBAR_PARAMS.VAR, varsStr);
    helper.set(SIDEBAR_PARAMS.GRID, gridSize);
    helper.set(SIDEBAR_PARAMS.MONTHS, monthsStr);

    if (dataset === DATASETS.CLIMATE) {
      helper.set(SIDEBAR_PARAMS.PERIOD_A, climatePeriodA);
      helper.set(SIDEBAR_PARAMS.PERIOD_B, climatePeriodB);
      helper.delete(SIDEBAR_PARAMS.PERIODS);
      helper.delete(SIDEBAR_PARAMS.YEAR_A);
      helper.delete(SIDEBAR_PARAMS.YEAR_B);
    } else {
      helper.set(SIDEBAR_PARAMS.PERIODS, periodsStr);
      helper.delete(SIDEBAR_PARAMS.PERIOD_A);
      helper.delete(SIDEBAR_PARAMS.PERIOD_B);
      helper.delete(SIDEBAR_PARAMS.YEAR_A);
      helper.delete(SIDEBAR_PARAMS.YEAR_B);
    }

    if (helper.changed) router.replace(`${pathname}?${helper.params.toString()}`);
  }, [
    cityA.label,
    cityA.lat,
    cityA.lng,
    dataset,
    climatePeriodA,
    climatePeriodB,
    periodsStr,
    varsStr,
    gridSize,
    monthsStr,
    searchParams,
    router,
    pathname,
  ]);

  useEffect(() => {
    const cityLabel = cityA.label;
    const validCity = cityLabel && !cityLabel.startsWith("url:") && !/^Q\d+$/.test(cityLabel);
    if (!validCity) {
      document.title = `Compare Periods | ${APP_TITLE}`;
      return;
    }
    const varLabel = variables[0] ? (VARIABLE_LABELS[variables[0]] ?? variables[0]) : "";
    if (dataset === DATASETS.CLIMATE) {
      const labelA = CLIMATE_PERIOD_LABELS[climatePeriodA] ?? climatePeriodA;
      const labelB = CLIMATE_PERIOD_LABELS[climatePeriodB] ?? climatePeriodB;
      document.title = `${cityLabel} · ${varLabel} ${labelA} vs ${labelB} | ${APP_TITLE}`;
    } else {
      document.title = `${cityLabel} · ${varLabel} ${periods.join(", ")} | ${APP_TITLE}`;
    }
  }, [cityA.label, dataset, climatePeriodA, climatePeriodB, periods, variables]);

  const {
    dataA,
    dataB,
    isLoading: isClimateLoading,
    error: climateError,
  } = useGetComparePeriods(
    cityA.lat,
    cityA.lng,
    climatePeriodA,
    climatePeriodB,
    periods[0] ?? WEATHER_MIN_YEAR,
    periods[1] ?? WEATHER_MAX_YEAR,
    gridSize,
    dataset,
  );

  const {
    data: periodsData,
    isLoading: isWeatherLoading,
    loadingPeriods,
    error: weatherError,
  } = useGetMultiPeriodData(
    cityA.lat,
    cityA.lng,
    gridSize,
    dataset === DATASETS.WEATHER ? periods : [],
  );

  const { data: altitude = null } = useGetAltitude(cityA.lat, cityA.lng, gridSize);

  const isLoading = dataset === DATASETS.CLIMATE ? isClimateLoading : isWeatherLoading;
  const error = dataset === DATASETS.CLIMATE ? climateError : weatherError;

  function handleLocate() {
    locate((city) => {
      userSelectedRef.current = true;
      selectCityA(city);
    });
  }

  function handleCitySelect(city: TWikidataCity) {
    userSelectedRef.current = true;
    selectCityA(city);

    void queryClient.invalidateQueries({ queryKey: ["compare-periods"] });

    if (syncCity && hasHydrated) {
      selectCompareCityA(city);
      void queryClient.invalidateQueries({ queryKey: ["climate"] });
      void queryClient.invalidateQueries({ queryKey: ["compare"] });
    }

    const nextParams = new URLSearchParams(searchParams);

    nextParams.set(SIDEBAR_PARAMS.CITY, city.label.trim());
    nextParams.set(SIDEBAR_PARAMS.LAT, city.lat.toFixed(4));
    nextParams.set(SIDEBAR_PARAMS.LNG, city.lng.toFixed(4));
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  useEffect(() => {
    const hasResults =
      dataset === DATASETS.CLIMATE ? dataA.length > 0 && dataB.length > 0 : periodsData.length > 0;

    if (!hasResults || !chartSectionRef.current) return;
    if (!userSelectedRef.current || !autoScroll) return;

    const timer = setTimeout(() => {
      if (chartSectionRef.current) {
        scrollToSection(chartSectionRef.current, { toBottom: true });
      }
    }, TIME.IN_MILLISECONDS.SECOND * 2);

    return () => clearTimeout(timer);
  }, [dataA, dataB, periodsData, dataset, autoScroll]);

  const resolvedLocationError = locationError !== null ? t(locationError) : null;

  return (
    <ComparePeriodsView
      city={cityA}
      altitude={altitude}
      dataset={dataset}
      isHydrated={hasHydrated}
      autoGrid={gridSize}
      selectedMonths={selectedMonths}
      isLoading={isLoading}
      isLocating={isLocating}
      error={error}
      locationError={resolvedLocationError}
      onCitySelect={handleCitySelect}
      onLocate={handleLocate}
      onClearLocationError={clearLocationError}
      climatePeriodA={climatePeriodA}
      climatePeriodB={climatePeriodB}
      dataA={dataA}
      dataB={dataB}
      onClimatePeriodAChange={setClimatePeriodA}
      onClimatePeriodBChange={setClimatePeriodB}
      periods={periods}
      periodsData={periodsData}
      loadingPeriods={loadingPeriods}
      chartSectionRef={chartSectionRef}
    />
  );
}
