import type { ReactNode } from "react";

export type TCollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  withDivider?: boolean;
  children: ReactNode;
  gapBetweenOptions?: string;
};
