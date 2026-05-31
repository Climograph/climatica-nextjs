"use client";

import type { TChartSubtitle } from "@/components/TempPrecipChart/TempPrecipChart.type";
import {
  APP_TITLE,
  CLIMATE_PERIOD_LABELS,
  DATASETS,
  SIDEBAR_PARAMS,
  TIME,
  VARIABLE_LABELS,
} from "@/constants";
import {
  useAutoScroll,
  useGeolocation,
  useGetAltitude,
  useGetCellBounds,
  useGetClimateData,
  usePersistedCity,
  usePersistedComparisonCities,
  useResolveCityByCoordinates,
} from "@/hooks";
import { useFiltersStore } from "@/stores";
import type { TWikidataCity } from "@/types";
import {
  applyUrlFiltersToStore,
  cityFromUrl,
  createUrlParamHelpers,
  encodeMonths,
  encodeVars,
  scrollToSection,
} from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/libs/I18nNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatCoordinate } from "./ClimateStatistics.util";
import { ClimateStatisticsView } from "./ClimateStatisticsView";

function resolveCityName(city: TWikidataCity): string {
  return /^Q\d+$/.test(city.label) ? city.description : city.label;
}

export function ClimateStatistics() {
  const t = useTranslations();
  const { city: selectedCity, selectCity } = usePersistedCity();
  const { selectCityA } = usePersistedComparisonCities();
  const { isLoading: isResolving, mutateAsync: resolveCityByCoordinates } =
    useResolveCityByCoordinates();
  const { locate, isLocating, locationError, clearLocationError } = useGeolocation();
  const { autoScroll } = useAutoScroll();
  const queryClient = useQueryClient();
  const latestMapClickIdRef = useRef(0);
  const userSelectedRef = useRef(false);
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    dataset,
    climatePeriod,
    weatherYear,
    gridSize,
    months,
    variables,
    syncCity,
    hasHydrated,
  } = useFiltersStore();
  const selectedMonths: number[] | null = Array.isArray(months) ? months : null;

  useEffect(() => {
    if (syncCity) {
      void queryClient.invalidateQueries({ queryKey: ["climate"] });
    }
  }, [selectedCity.lat, selectedCity.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const [chartCityName, setChartCityName] = useState<string>(() => resolveCityName(selectedCity));

  const subtitle: TChartSubtitle =
    dataset === DATASETS.CLIMATE
      ? { dataset: DATASETS.CLIMATE, climatePeriod }
      : { dataset: DATASETS.WEATHER, weatherYear };

  // Restore city and filters from URL once on mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const cityLabel = searchParams.get(SIDEBAR_PARAMS.CITY);
    const urlCity = cityFromUrl(
      searchParams.get(SIDEBAR_PARAMS.LAT),
      searchParams.get(SIDEBAR_PARAMS.LNG),
      cityLabel,
    );
    if (urlCity) {
      selectCity(urlCity);
      if (cityLabel) setChartCityName(cityLabel);
    }

    applyUrlFiltersToStore(searchParams, useFiltersStore.getState().actions, {
      includeMonths: true,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync all shareable state → URL (replace, no history pollution)
  const cityLabel = selectedCity.label.trim();
  const latStr = selectedCity.lat.toFixed(4);
  const lngStr = selectedCity.lng.toFixed(4);
  const varsStr = useMemo(() => encodeVars(variables), [variables]);
  const monthsStr = useMemo(() => encodeMonths(months), [months]);

  useEffect(() => {
    const helper = createUrlParamHelpers(searchParams);

    helper.set(SIDEBAR_PARAMS.CITY, cityLabel);
    helper.set(SIDEBAR_PARAMS.LAT, latStr);
    helper.set(SIDEBAR_PARAMS.LNG, lngStr);
    helper.set(SIDEBAR_PARAMS.DATASET, dataset);
    helper.set(SIDEBAR_PARAMS.VAR, varsStr);
    helper.set(SIDEBAR_PARAMS.GRID, gridSize);
    helper.set(SIDEBAR_PARAMS.MONTHS, monthsStr);

    if (dataset === DATASETS.CLIMATE) {
      helper.set(SIDEBAR_PARAMS.PERIOD, climatePeriod);
      helper.delete(SIDEBAR_PARAMS.YEAR);
    } else {
      helper.set(SIDEBAR_PARAMS.YEAR, String(weatherYear));
      helper.delete(SIDEBAR_PARAMS.PERIOD);
    }

    if (helper.changed) router.replace(`${pathname}?${helper.params.toString()}`);
  }, [
    cityLabel,
    latStr,
    lngStr,
    dataset,
    climatePeriod,
    weatherYear,
    varsStr,
    gridSize,
    monthsStr,
    searchParams,
    router,
    pathname,
  ]);

  // Document title
  useEffect(() => {
    const cityStr = chartCityName || cityLabel;
    if (!cityStr) {
      document.title = `City Climate | ${APP_TITLE}`;
      return;
    }
    const varLabel = variables[0] ? (VARIABLE_LABELS[variables[0]] ?? variables[0]) : "";
    const periodStr =
      dataset === DATASETS.CLIMATE
        ? (CLIMATE_PERIOD_LABELS[climatePeriod] ?? climatePeriod)
        : String(weatherYear);
    document.title = `${cityStr} · ${varLabel} ${periodStr} | ${APP_TITLE}`;
  }, [chartCityName, cityLabel, variables, dataset, climatePeriod, weatherYear]);

  function handleCitySelect(city: TWikidataCity) {
    userSelectedRef.current = true;
    clearLocationError();
    const name = resolveCityName(city);
    if (name) setChartCityName(name);
    selectCity(city);
    if (syncCity && hasHydrated) {
      selectCityA(city);
      void queryClient.invalidateQueries({ queryKey: ["compare"] });
      void queryClient.invalidateQueries({ queryKey: ["compare-periods"] });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set(SIDEBAR_PARAMS.CITY, city.label.trim());
    nextParams.set(SIDEBAR_PARAMS.LAT, city.lat.toFixed(4));
    nextParams.set(SIDEBAR_PARAMS.LNG, city.lng.toFixed(4));
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  function handleLocate() {
    locate((city) => {
      userSelectedRef.current = true;
      const name = resolveCityName(city);
      if (name) setChartCityName(name);
      selectCity(city);
    });
  }

  async function resolveClickedLocation(lat: number, lng: number) {
    const currentMapClickId = latestMapClickIdRef.current + 1;
    latestMapClickIdRef.current = currentMapClickId;

    const latLabel = formatCoordinate(lat);
    const lngLabel = formatCoordinate(lng);

    const provisionalCity: TWikidataCity = {
      id: `map:${latLabel},${lngLabel}`,
      label: t("map.pointLabel", { lat: latLabel, lng: lngLabel }),
      description: t("map.selectedFromMap"),
      lat,
      lng,
    };

    userSelectedRef.current = true;
    selectCity(provisionalCity);

    try {
      const resolvedCity = await resolveCityByCoordinates({ lat, lng });
      if (!resolvedCity || latestMapClickIdRef.current !== currentMapClickId) {
        return;
      }

      const name = resolveCityName(resolvedCity);
      if (name) setChartCityName(name);

      selectCity({
        ...resolvedCity,
        lat,
        lng,
      });
    } catch {
      // keep provisional map label if reverse lookup fails
    }
  }

  function handleMapClick(lat: number, lng: number) {
    void resolveClickedLocation(lat, lng);
  }

  const {
    data: temperatureData = [],
    isLoading,
    isFetching,
    isError,
  } = useGetClimateData(selectedCity.lat, selectedCity.lng, gridSize);

  const { data: altitude = null } = useGetAltitude(selectedCity.lat, selectedCity.lng, gridSize);
  const { data: cellBounds = null } = useGetCellBounds(
    selectedCity.lat,
    selectedCity.lng,
    gridSize,
  );

  useEffect(() => {
    if (!temperatureData.length || !chartSectionRef.current) return;
    if (!userSelectedRef.current || !autoScroll) return;

    const timer = setTimeout(() => {
      if (chartSectionRef.current) {
        scrollToSection(chartSectionRef.current, { offset: 20 });
      }
    }, TIME.IN_MILLISECONDS.SECOND * 2);

    return () => clearTimeout(timer);
  }, [temperatureData, autoScroll]);

  const resolvedLocationError = locationError !== null ? t(locationError) : null;

  return (
    <ClimateStatisticsView
      selectedCity={selectedCity}
      mapCenter={{ lat: selectedCity.lat, lng: selectedCity.lng }}
      temperatureData={temperatureData}
      cityName={chartCityName}
      subtitle={subtitle}
      altitude={altitude}
      cellBounds={cellBounds}
      gridSize={gridSize}
      selectedMonths={selectedMonths}
      variables={variables}
      isLoading={isLoading}
      isFetching={isFetching || isResolving}
      isLocating={isLocating}
      error={isError ? t("errors.fetchClimateData") : null}
      locationError={resolvedLocationError}
      onCitySelect={handleCitySelect}
      onMapClick={handleMapClick}
      onLocate={handleLocate}
      onClearLocationError={clearLocationError}
      chartSectionRef={chartSectionRef}
    />
  );
}
