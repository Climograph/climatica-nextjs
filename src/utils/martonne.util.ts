import { MARTONNE_CLASSES } from "@/constants";
import type { TMartonnClass } from "@/constants/martonne.constant";
import type { TMartonneBadge } from "@/types";

export function getMartonneBadge(idm: number): TMartonneBadge {
  const key = getMartonnClass(idm);
  const { labelKey, bg, color } = MARTONNE_CLASSES[key];
  return { labelKey, bg, color };
}

export function getMartonneLabelKey(idm: number): string {
  return getMartonneBadge(idm).labelKey;
}

function getMartonnClass(idm: number): TMartonnClass {
  if (idm < 10) return "arid";
  if (idm < 20) return "semiArid";
  if (idm < 24) return "mediterranean";
  if (idm < 28) return "semiHumid";
  if (idm < 35) return "humid";
  if (idm <= 55) return "veryHumid";
  return "extremelyHumid";
}
