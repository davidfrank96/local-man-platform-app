"use client";

import type { ReactNode } from "react";

type AdminScrollPanelProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

export function AdminScrollPanel({
  children,
  className,
  ariaLabel,
  ariaLabelledBy,
}: AdminScrollPanelProps) {
  const classes = ["admin-scroll-panel", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role="region"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </div>
  );
}
