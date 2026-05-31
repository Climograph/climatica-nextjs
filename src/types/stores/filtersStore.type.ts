import type { TCellSize, TClimatePeriod, TDataset, TMonthFilter, TVariable } from "@/types";

export type TFiltersData = {
  dataset: TDataset;
  climatePeriod: TClimatePeriod;
  weatherYear: number;
  variables: TVariable[];
  gridSize: TCellSize;
  months: TMonthFilter;
};

export type TFiltersState = TFiltersData & {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  syncCity: boolean;
  setSyncCity: (value: boolean) => void;
  actions: {
    setDataset: (d: TDataset) => void;
    setClimatePeriod: (period: TClimatePeriod) => void;
    setWeatherYear: (year: number) => void;
    toggleVariable: (v: TVariable) => void;
    setVariables: (vars: TVariable[]) => void;
    setGridSize: (g: TCellSize) => void;
    toggleMonth: (n: number) => void;
    selectAllMonths: () => void;
    setMonths: (months: TMonthFilter) => void;
  };
};
