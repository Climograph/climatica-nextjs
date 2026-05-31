"use client";

import { useState } from "react";
import type { TCollapsibleSectionProps } from "./CollapsibleSection.type";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 6"
      fill="none"
      className={`h-3 w-3 shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  withDivider = false,
  children,
  gapBetweenOptions = "gap-8",
}: TCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={withDivider ? "border-t border-[var(--color-border)] pt-2" : ""}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-2 flex w-full items-center justify-between"
      >
        <span
          className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]"
          suppressHydrationWarning
        >
          {title}
        </span>
        <ChevronDownIcon
          className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && <div className={`flex flex-col ${gapBetweenOptions}`}>{children}</div>}
    </div>
  );
}
