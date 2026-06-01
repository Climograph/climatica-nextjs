export const MARTONNE_CLASSES = {
  arid: { max: 10, labelKey: "martonne.arid", bg: "#fde8d0", color: "#7d3c00" },
  semiArid: { min: 10, max: 20, labelKey: "martonne.semiArid", bg: "#fff3cd", color: "#664d03" },
  mediterranean: {
    min: 20,
    max: 24,
    labelKey: "martonne.mediterranean",
    bg: "#fef9c3",
    color: "#713f12",
  },
  semiHumid: { min: 24, max: 28, labelKey: "martonne.semiHumid", bg: "#d1f0e0", color: "#0a4d2e" },
  humid: { min: 28, max: 35, labelKey: "martonne.humid", bg: "#cfe2ff", color: "#084298" },
  veryHumid: { min: 35, max: 55, labelKey: "martonne.veryHumid", bg: "#dbeafe", color: "#1e3a8a" },
  extremelyHumid: { min: 55, labelKey: "martonne.extremelyHumid", bg: "#e2d9f3", color: "#3d1a78" },
} as const;

export type TMartonnClass = keyof typeof MARTONNE_CLASSES;
