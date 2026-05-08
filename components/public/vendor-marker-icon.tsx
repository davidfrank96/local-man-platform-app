const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const STOREFRONT_PATHS = [
  "M5.25 6.25h13.5l.95 3.15H4.3l.95-3.15Z",
  "M6.75 10.25h10.5v7.5H6.75z",
  "M8.25 12h2.75v5.75H8.25z",
  "M12.75 12h3v2.5h-3z",
] as const;

type StoreMarkerIconProps = {
  className?: string;
};

function appendSvgPath(
  ownerDocument: Document,
  svg: SVGSVGElement,
  pathDefinition: string,
) {
  const path = ownerDocument.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathDefinition);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
}

export function createStoreMarkerIconElement(
  ownerDocument: Document,
  className: string,
): SVGSVGElement {
  const svg = ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);

  for (const pathDefinition of STOREFRONT_PATHS) {
    appendSvgPath(ownerDocument, svg, pathDefinition);
  }

  return svg;
}

export function StoreMarkerIcon({ className }: StoreMarkerIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
    >
      {STOREFRONT_PATHS.map((pathDefinition) => (
        <path d={pathDefinition} fill="currentColor" key={pathDefinition} />
      ))}
    </svg>
  );
}
