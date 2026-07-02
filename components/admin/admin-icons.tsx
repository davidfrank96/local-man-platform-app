import type { SVGProps } from "react";

export type AdminIconName =
  | "activity"
  | "arrow-right"
  | "bell"
  | "chart"
  | "chevron-down"
  | "clipboard"
  | "file"
  | "grid"
  | "image"
  | "lightning"
  | "link"
  | "lock"
  | "menu"
  | "panel"
  | "plus"
  | "refresh"
  | "rider"
  | "search"
  | "shield"
  | "storefront"
  | "utensils"
  | "users"
  | "x";

type AdminIconProps = SVGProps<SVGSVGElement> & {
  name: AdminIconName;
};

export function AdminIcon({ name, ...props }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      {renderAdminIconPath(name)}
    </svg>
  );
}

function renderAdminIconPath(name: AdminIconName) {
  const strokeProps = {
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.85,
  };

  switch (name) {
    case "activity":
      return (
        <>
          <circle cx="12" cy="12" r="9" {...strokeProps} />
          <path d="M12 7v5l3 2" {...strokeProps} />
        </>
      );
    case "arrow-right":
      return (
        <>
          <path d="M5 12h14" {...strokeProps} />
          <path d="m13 6 6 6-6 6" {...strokeProps} />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M18 10a6 6 0 0 0-12 0c0 7-3 6-3 8h18c0-2-3-1-3-8" {...strokeProps} />
          <path d="M10 21h4" {...strokeProps} />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M5 19V9" {...strokeProps} />
          <path d="M12 19V5" {...strokeProps} />
          <path d="M19 19v-7" {...strokeProps} />
        </>
      );
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" {...strokeProps} />;
    case "clipboard":
      return (
        <>
          <path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" {...strokeProps} />
          <path d="M9 10h6M9 14h6M9 18h4" {...strokeProps} />
        </>
      );
    case "file":
      return (
        <>
          <path d="M7 3h7l4 4v14H7V3Z" {...strokeProps} />
          <path d="M14 3v5h5" {...strokeProps} />
          <path d="M9.5 13h5M9.5 17h5" {...strokeProps} />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
        </>
      );
    case "image":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" {...strokeProps} />
          <path d="m7 16 3.3-3.3a1.5 1.5 0 0 1 2.1 0L16 16" {...strokeProps} />
          <circle cx="16.5" cy="9.5" r="1.4" {...strokeProps} />
        </>
      );
    case "lightning":
      return <path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z" {...strokeProps} />;
    case "link":
      return (
        <>
          <path d="M9.5 14.5 14.5 9.5" {...strokeProps} />
          <path d="M8.5 11.5 7 13a3.5 3.5 0 0 0 5 5l1.5-1.5" {...strokeProps} />
          <path d="M15.5 12.5 17 11a3.5 3.5 0 0 0-5-5l-1.5 1.5" {...strokeProps} />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" {...strokeProps} />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" {...strokeProps} />
        </>
      );
    case "menu":
      return (
        <>
          <path d="M4 7h16" {...strokeProps} />
          <path d="M4 12h16" {...strokeProps} />
          <path d="M4 17h16" {...strokeProps} />
        </>
      );
    case "panel":
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" {...strokeProps} />
          <path d="M9 4v16" {...strokeProps} />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 5v14" {...strokeProps} />
          <path d="M5 12h14" {...strokeProps} />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M20 11a8 8 0 0 0-14.8-4" {...strokeProps} />
          <path d="M5 3v4h4" {...strokeProps} />
          <path d="M4 13a8 8 0 0 0 14.8 4" {...strokeProps} />
          <path d="M19 21v-4h-4" {...strokeProps} />
        </>
      );
    case "rider":
      return (
        <>
          <circle cx="8" cy="17" r="2.5" {...strokeProps} />
          <circle cx="17" cy="17" r="2.5" {...strokeProps} />
          <path d="M8 17h4l2-6h3l-2 6" {...strokeProps} />
          <path d="M12 11H8.5L7 14" {...strokeProps} />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="6" {...strokeProps} />
          <path d="m16 16 4 4" {...strokeProps} />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" {...strokeProps} />
          <path d="m9 12 2 2 4-5" {...strokeProps} />
        </>
      );
    case "storefront":
      return (
        <>
          <path d="M5 10h14l-1.2-5H6.2L5 10Z" {...strokeProps} />
          <path d="M6 10v9h12v-9" {...strokeProps} />
          <path d="M9 19v-5h6v5" {...strokeProps} />
          <path d="M4 10c0 1.2.9 2 2 2s2-.8 2-2c0 1.2.9 2 2 2s2-.8 2-2c0 1.2.9 2 2 2s2-.8 2-2c0 1.2.9 2 2 2s2-.8 2-2" {...strokeProps} />
        </>
      );
    case "utensils":
      return (
        <>
          <path d="M7 3v8" {...strokeProps} />
          <path d="M4.5 3v8" {...strokeProps} />
          <path d="M9.5 3v8" {...strokeProps} />
          <path d="M4.5 7h5" {...strokeProps} />
          <path d="M7 11v10" {...strokeProps} />
          <path d="M16 3c2 1.5 3 3.3 3 5.5s-1.1 4-3 5.5v7" {...strokeProps} />
        </>
      );
    case "users":
      return (
        <>
          <circle cx="9" cy="8" r="3" {...strokeProps} />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...strokeProps} />
          <path d="M15 10a2.5 2.5 0 0 0 0-5" {...strokeProps} />
          <path d="M17 19a4 4 0 0 0-3-3.8" {...strokeProps} />
        </>
      );
    case "x":
      return (
        <>
          <path d="m6 6 12 12" {...strokeProps} />
          <path d="m18 6-12 12" {...strokeProps} />
        </>
      );
  }
}
