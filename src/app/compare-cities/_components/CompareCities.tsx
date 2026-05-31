"use client";

import type { TChartSubtitle } from "@/components/TempPrecipChart";
import { APP_TITLE, DATASETS, SIDEBAR_PARAMS, TIME } from "@/constants";
import {
  useAutoScroll,
  useGetAltitude,
  useGetCompareData,
  usePersistedCity,
  usePersistedComparisonCities,
} from "@/hooks";
import { usePathname, useRouter } from "@/libs/I18nNavigation";
import { useFiltersStore } from "@/stores";
import type { TWikidataCity } from "@/types";
import {
  applyUrlFiltersToStore,
  cityFromUrl,
  createUrlParamHelpers,
  encodeVars,
  scrollToSection,
} from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { CompareCitiesView } from "./CompareCitiesView";

export function CompareCities() {
  const { autoScroll } = useAutoScroll();
  const queryClient = useQueryClient();
  const userSelectedRef = useRef(false);
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const { cityA, cityB, selectCityA, selectCityB } = usePersistedComparisonCities();
  const { selectCity: selectCityClimate } = usePersistedCity();
  const {
    gridSize,
    dataset,
    climatePeriod,
    weatherYear,
    months,
    variables,
    syncCity,
    hasHydrated,
  } = useFiltersStore();
  const selectedMonths = Array.isArray(months) ? months : null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const urlCityA = cityFromUrl(
      searchParams.get(SIDEBAR_PARAMS.LAT_A),
      searchParams.get(SIDEBAR_PARAMS.LNG_A),
      searchParams.get(SIDEBAR_PARAMS.COMPARE_CITY_A),
    );
    if (urlCityA) selectCityA(urlCityA);

    const urlCityB = cityFromUrl(
      searchParams.get(SIDEBAR_PARAMS.LAT_B),
      searchParams.get(SIDEBAR_PARAMS.LNG_B),
      searchParams.get(SIDEBAR_PARAMS.COMPARE_CITY_B),
    );
    if (urlCityB) selectCityB(urlCityB);

    applyUrlFiltersToStore(searchParams, useFiltersStore.getState().actions);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const varsStr = useMemo(() => encodeVars(variables), [variables]);

  useEffect(() => {
    const helper = createUrlParamHelpers(searchParams);

    helper.set(SIDEBAR_PARAMS.COMPARE_CITY_A, cityA.label);
    helper.set(SIDEBAR_PARAMS.LAT_A, cityA.lat.toFixed(4));
    helper.set(SIDEBAR_PARAMS.LNG_A, cityA.lng.toFixed(4));
    helper.set(SIDEBAR_PARAMS.COMPARE_CITY_B, cityB.label);
    helper.set(SIDEBAR_PARAMS.LAT_B, cityB.lat.toFixed(4));
    helper.set(SIDEBAR_PARAMS.LNG_B, cityB.lng.toFixed(4));
    helper.set(SIDEBAR_PARAMS.DATASET, dataset);
    helper.set(SIDEBAR_PARAMS.VAR, varsStr);
    helper.set(SIDEBAR_PARAMS.GRID, gridSize);

    if (dataset === DATASETS.CLIMATE) {
      helper.set(SIDEBAR_PARAMS.PERIOD, climatePeriod);
      helper.delete(SIDEBAR_PARAMS.YEAR);
    } else {
      helper.set(SIDEBAR_PARAMS.YEAR, String(weatherYear));
      helper.delete(SIDEBAR_PARAMS.PERIOD);
    }

    if (helper.changed) router.replace(`${pathname}?${helper.params.toString()}`);
  }, [
    cityA.label,
    cityA.lat,
    cityA.lng,
    cityB.label,
    cityB.lat,
    cityB.lng,
    dataset,
    climatePeriod,
    weatherYear,
    varsStr,
    gridSize,
    searchParams,
    router,
    pathname,
  ]);

  useEffect(() => {
    const labelA = cityA.label;
    const labelB = cityB.label;
    const bothValid =
      labelA &&
      labelB &&
      !labelA.startsWith("url:") &&
      !labelB.startsWith("url:") &&
      !/^Q\d+$/.test(labelA) &&
      !/^Q\d+$/.test(labelB);
    document.title = bothValid
      ? `${labelA} vs ${labelB} | ${APP_TITLE}`
      : `Compare Cities | ${APP_TITLE}`;
  }, [cityA.label, cityB.label]);

  const subtitle: TChartSubtitle =
    dataset === DATASETS.CLIMATE ? { dataset, climatePeriod } : { dataset, weatherYear };

  const {
    cityA: dataA,
    cityB: dataB,
    isLoading,
    error,
  } = useGetCompareData(cityA.lat, cityA.lng, cityB.lat, cityB.lng, gridSize);

  const { data: altitudeA = null } = useGetAltitude(cityA.lat, cityA.lng, gridSize);
  const { data: altitudeB = null } = useGetAltitude(cityB.lat, cityB.lng, gridSize);

  function handleCityASelect(city: TWikidataCity) {
    userSelectedRef.current = true;
    selectCityA(city);

    void queryClient.invalidateQueries({ queryKey: ["compare"] });

    if (syncCity && hasHydrated) {
      selectCityClimate(city);
      void queryClient.invalidateQueries({ queryKey: ["climate"] });
      void queryClient.invalidateQueries({ queryKey: ["compare-periods"] });
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set(SIDEBAR_PARAMS.COMPARE_CITY_A, city.label);
    nextParams.set(SIDEBAR_PARAMS.LAT_A, city.lat.toFixed(4));
    nextParams.set(SIDEBAR_PARAMS.LNG_A, city.lng.toFixed(4));
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  function handleCityBSelect(city: TWikidataCity) {
    userSelectedRef.current = true;
    selectCityB(city);

    void queryClient.invalidateQueries({ queryKey: ["compare"] });

    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set(SIDEBAR_PARAMS.COMPARE_CITY_B, city.label);
    nextParams.set(SIDEBAR_PARAMS.LAT_B, city.lat.toFixed(4));
    nextParams.set(SIDEBAR_PARAMS.LNG_B, city.lng.toFixed(4));
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  useEffect(() => {
    if (!dataA.length || !dataB.length || !chartSectionRef.current) return;
    if (!userSelectedRef.current || !autoScroll) return;

    const timer = setTimeout(() => {
      if (chartSectionRef.current) {
        scrollToSection(chartSectionRef.current, { toBottom: true });
      }
    }, TIME.IN_MILLISECONDS.SECOND * 2);

    return () => clearTimeout(timer);
  }, [dataA, dataB, autoScroll]);

  return (
    <CompareCitiesView
      cityA={cityA}
      cityB={cityB}
      dataA={dataA}
      dataB={dataB}
      autoGrid={gridSize}
      subtitle={subtitle}
      selectedMonths={selectedMonths}
      isLoading={isLoading}
      error={error}
      altitudeA={altitudeA}
      altitudeB={altitudeB}
      onCityASelect={handleCityASelect}
      onCityBSelect={handleCityBSelect}
      chartSectionRef={chartSectionRef}
    />
  );
}
