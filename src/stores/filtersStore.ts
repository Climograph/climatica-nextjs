"use client";

import {
  CELL_SIZES,
  CLIMATE_PERIODS,
  DATASETS,
  DEFAULT_VARIABLES,
  PERIOD_RESTRICTED_VARIABLES,
  WEATHER_VARIABLES,
} from "@/constants";
import type { TFiltersData, TFiltersState } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_FILTERS: TFiltersData = {
  dataset: DATASETS.CLIMATE,
  climatePeriod: CLIMATE_PERIODS.C1970_2000,
  weatherYear: 2024,
  variables: [...DEFAULT_VARIABLES],
  gridSize: CELL_SIZES.TEN_MINUTES,
  months: "all",
};

export const useFiltersStore = create<TFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_FILTERS,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      syncCity: true,
      setSyncCity: (value) => set({ syncCity: value }),
      actions: {
        setDataset: (dataset) =>
          set((state) => {
            if (dataset === DATASETS.WEATHER) {
              const allowed = new Set<string>(WEATHER_VARIABLES);
              const filtered = state.variables.filter((v) => allowed.has(v));
              const gridSize =
                state.gridSize === CELL_SIZES.THIRTY_SECONDS
                  ? CELL_SIZES.TWO_POINT_FIVE_MINUTES
                  : state.gridSize;
              return {
                dataset,
                variables: filtered.length > 0 ? filtered : [...DEFAULT_VARIABLES],
                gridSize,
              };
            }
            return { dataset };
          }),
        setClimatePeriod: (climatePeriod) =>
          set((state) => {
            if (climatePeriod === CLIMATE_PERIODS.C1970_2000) return { climatePeriod };
            const restricted = new Set<string>(PERIOD_RESTRICTED_VARIABLES);
            const filtered = state.variables.filter((v) => !restricted.has(v));
            const gridSize =
              state.gridSize === CELL_SIZES.THIRTY_SECONDS
                ? CELL_SIZES.TWO_POINT_FIVE_MINUTES
                : state.gridSize;
            return {
              climatePeriod,
              variables: filtered.length > 0 ? filtered : [...DEFAULT_VARIABLES],
              gridSize,
            };
          }),
        setWeatherYear: (weatherYear) => set({ weatherYear }),
        toggleVariable: (v) =>
          set((state) => ({
            variables: state.variables.includes(v)
              ? state.variables.filter((x) => x !== v)
              : [...state.variables, v],
          })),
        setVariables: (variables) => set({ variables }),
        setGridSize: (gridSize) => set({ gridSize }),
        toggleMonth: (n) =>
          set((state) => {
            const { months } = state;
            if (!Array.isArray(months)) return { months: [n] };
            if (months.includes(n)) {
              const next = months.filter((m) => m !== n);
              return { months: next.length === 0 ? "all" : next };
            }
            const next = [...months, n];
            return { months: next.length === 12 ? "all" : next };
          }),
        selectAllMonths: () => set({ months: "all" }),
        setMonths: (months) => set({ months }),
      },
    }),
    {
      name: "climatica-filters",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        dataset: state.dataset,
        climatePeriod: state.climatePeriod,
        weatherYear: state.weatherYear,
        variables: state.variables,
        gridSize: state.gridSize,
        months: state.months,
        syncCity: state.syncCity,
      }),
    },
  ),
);
