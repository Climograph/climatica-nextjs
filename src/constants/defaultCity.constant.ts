import type { TWikidataCity } from "@/types";

export const DEFAULT_HEATMAP_BBOX = {
  north: -20.87,
  south: -21.39,
  west: 55.21,
  east: 55.84,
} as const;

export const DEFAULT_HEATMAP_LOCATION = {
  lat: 51.5074,
  lng: -0.1278,
} as const;

export const DEFAULT_CITY: TWikidataCity = {
  id: "Q2807",
  label: "Madrid",
  description: "capital of Spain",
  lat: 40.4168,
  lng: -3.7038,
};

export const DEFAULT_COMPARE_CITY_A: TWikidataCity = {
  id: "Q2807",
  label: "Madrid",
  description: "capital of Spain",
  lat: 40.4168,
  lng: -3.7038,
};

export const DEFAULT_COMPARE_CITY_B: TWikidataCity = {
  id: "Q220",
  label: "Rome",
  description: "capital of Italy",
  lat: 41.8919,
  lng: 12.5113,
};
