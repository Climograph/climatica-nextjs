"use client";

import {
  APP_TITLE,
  CLIMATE_PERIOD_LABELS,
  DATASETS,
  SIDEBAR_PARAMS,
  VARIABLE_LABELS,
} from "@/constants";
import {
  useGeolocation,
  useGetHeatmapData,
  useGetHeatmapPolygonData,
  useGetRegionalProfile,
  usePersistedCity,
  usePersistedComparisonCities,
} from "@/hooks";
import { useFiltersStore } from "@/stores";
import type { TBbox, TColorScale, TWikidataCity } from "@/types";
import { applyUrlFiltersToStore, createUrlParamHelpers, encodeVars } from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/libs/I18nNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { TDrawMode, TMapTarget, TPolygon } from "./HeatMap.type";
import { computeRegionalProfile, polygonToWkt, wktToPolygon } from "./HeatMap.util";
import { HeatMapView } from "./HeatMapView";

export function HeatMap() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { city: persistedCity, selectCity } = usePersistedCity();
  const isFirstRenderRef = useRef(true);
  const { selectCityA } = usePersistedComparisonCities();
  const [drawMode, setDrawMode] = useState<TDrawMode>("none");

  // Restore polygon from URL on mount; lazy initializer reads searchParams once
  const [polygon, setPolygon] = useState<TPolygon | null>(() => {
    const raw = searchParams.get(SIDEBAR_PARAMS.POLYGON);
    return raw !== null ? wktToPolygon(raw) : null;
  });

  const [mapTarget, setMapTarget] = useState<TMapTarget | null>(null);
  const { locate, isLocating, locationError, clearLocationError } = useGeolocation();

  const {
    dataset,
    climatePeriod,
    weatherYear,
    gridSize: grid,
    variables,
    months,
    syncCity,
    hasHydrated,
  } = useFiltersStore();
  const isClimate = dataset === DATASETS.CLIMATE;
  const year = isClimate ? undefined : weatherYear;
  const selectedMonths: number[] = months === "all" ? [] : months;
  const periodLabel = isClimate ? CLIMATE_PERIOD_LABELS[climatePeriod] : String(weatherYear);
  const activeVariable = variables[0] ?? "tmax";
  const colorScale: TColorScale = activeVariable === "prec" ? "precipitation" : "temperature";

  // Bbox from URL search params
  const northRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_NORTH);
  const southRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_SOUTH);
  const westRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_WEST);
  const eastRaw = searchParams.get(SIDEBAR_PARAMS.BBOX_EAST);
  const bbox: TBbox | null =
    northRaw !== null && southRaw !== null && westRaw !== null && eastRaw !== null
      ? {
          north: Number(northRaw),
          south: Number(southRaw),
          west: Number(westRaw),
          east: Number(eastRaw),
        }
      : null;

  // Restore global filters from URL once on mount
  useEffect(() => {
    applyUrlFiltersToStore(searchParams, useFiltersStore.getState().actions);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Center map when city is synced from another page
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!syncCity || !hasHydrated) return;
    setMapTarget({ lat: persistedCity.lat, lng: persistedCity.lng });
  }, [persistedCity.lat, persistedCity.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filter params → URL (replace); separate from bbox/polygon writers
  const varsStr = useMemo(() => encodeVars(variables), [variables]);

  useEffect(() => {
    const helper = createUrlParamHelpers(searchParams);

    helper.set(SIDEBAR_PARAMS.DATASET, dataset);
    helper.set(SIDEBAR_PARAMS.VAR, varsStr);
    helper.set(SIDEBAR_PARAMS.GRID, grid);

    if (isClimate) {
      helper.set(SIDEBAR_PARAMS.PERIOD, climatePeriod);
      helper.delete(SIDEBAR_PARAMS.YEAR);
    } else {
      helper.set(SIDEBAR_PARAMS.YEAR, String(weatherYear));
      helper.delete(SIDEBAR_PARAMS.PERIOD);
    }

    if (helper.changed) router.replace(`${pathname}?${helper.params.toString()}`);
  }, [
    dataset,
    climatePeriod,
    weatherYear,
    isClimate,
    varsStr,
    grid,
    searchParams,
    router,
    pathname,
  ]);

  // Document title
  useEffect(() => {
    const varLabel = VARIABLE_LABELS[activeVariable] ?? activeVariable;
    const periodStr = isClimate
      ? (CLIMATE_PERIOD_LABELS[climatePeriod] ?? climatePeriod)
      : String(weatherYear);
    document.title = `Region Heatmap · ${varLabel} ${periodStr} | ${APP_TITLE}`;
  }, [activeVariable, isClimate, climatePeriod, weatherYear]);

  const wkt = polygon ? polygonToWkt(polygon) : null;

  const {
    pixels: bboxPixels,
    isLoading: bboxLoading,
    error: bboxError,
  } = useGetHeatmapData(
    polygon ? null : bbox,
    grid,
    activeVariable,
    isClimate,
    climatePeriod,
    year,
  );

  const {
    pixels: polyPixels,
    isLoading: polyLoading,
    error: polyError,
  } = useGetHeatmapPolygonData(wkt, grid, activeVariable, isClimate, climatePeriod, year);

  const pixels = polygon ? polyPixels : bboxPixels;
  const isLoading = polygon ? polyLoading : bboxLoading;
  const error = polygon ? polyError : bboxError;

  const hasData = (pixels?.results.bindings.length ?? 0) > 0;

  const { profileData, isProfileLoading } = useGetRegionalProfile(
    polygon ? null : bbox,
    wkt,
    grid,
    isClimate,
    climatePeriod,
    year,
    hasData,
  );

  const profile = profileData
    ? computeRegionalProfile(profileData.tmax, profileData.tmin, profileData.prec)
    : null;

  function handleDrawModeChange(mode: TDrawMode) {
    setDrawMode(mode);
    if (mode !== "none") {
      setPolygon(null);
      applySelection(null, null);
    }
  }

  function applySelection(nextBbox: TBbox | null, nextPolygon: TPolygon | null) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextBbox) {
      nextParams.set(SIDEBAR_PARAMS.BBOX_NORTH, String(nextBbox.north));
      nextParams.set(SIDEBAR_PARAMS.BBOX_SOUTH, String(nextBbox.south));
      nextParams.set(SIDEBAR_PARAMS.BBOX_WEST, String(nextBbox.west));
      nextParams.set(SIDEBAR_PARAMS.BBOX_EAST, String(nextBbox.east));
    } else {
      nextParams.delete(SIDEBAR_PARAMS.BBOX_NORTH);
      nextParams.delete(SIDEBAR_PARAMS.BBOX_SOUTH);
      nextParams.delete(SIDEBAR_PARAMS.BBOX_WEST);
      nextParams.delete(SIDEBAR_PARAMS.BBOX_EAST);
    }
    if (nextPolygon) {
      nextParams.set(SIDEBAR_PARAMS.POLYGON, polygonToWkt(nextPolygon));
    } else {
      nextParams.delete(SIDEBAR_PARAMS.POLYGON);
    }
    router.replace(`${pathname}?${nextParams.toString()}`);
  }

  function handleBboxChange(next: TBbox | null) {
    setDrawMode("none");
    setPolygon(null);
    applySelection(next, null);
  }

  function handlePolygonChange(next: TPolygon | null) {
    setDrawMode("none");
    setPolygon(next);
    applySelection(null, next);
  }

  function handleClear() {
    setPolygon(null);
    setDrawMode("none");
    applySelection(null, null);
  }

  function handleCitySelect(city: TWikidataCity) {
    setMapTarget({ lat: city.lat, lng: city.lng });
    if (syncCity) {
      selectCity(city);
      selectCityA(city);
      void queryClient.invalidateQueries({ queryKey: ["climate"] });
      void queryClient.invalidateQueries({ queryKey: ["compare"] });
      void queryClient.invalidateQueries({ queryKey: ["compare-periods"] });
    }
  }

  function handleLocate() {
    locate(handleCitySelect);
  }

  const resolvedLocationError = locationError !== null ? t(locationError) : null;

  return (
    <HeatMapView
      bbox={bbox}
      polygon={polygon}
      pixels={pixels}
      gridSize={grid}
      activeVariable={activeVariable}
      colorScale={colorScale}
      drawMode={drawMode}
      isLoading={isLoading}
      isLocating={isLocating}
      error={error}
      locationError={resolvedLocationError}
      mapTarget={mapTarget}
      onDrawModeChange={handleDrawModeChange}
      onBboxChange={handleBboxChange}
      onPolygonChange={handlePolygonChange}
      onClear={handleClear}
      isClimate={isClimate}
      selectedMonths={selectedMonths}
      periodLabel={periodLabel}
      profile={profile}
      isProfileLoading={isProfileLoading}
      onCitySelect={handleCitySelect}
      onLocate={handleLocate}
      onClearLocationError={clearLocationError}
    />
  );
}
