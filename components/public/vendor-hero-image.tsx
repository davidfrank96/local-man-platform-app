"use client";

import { useMemo, useState } from "react";
import {
  buildVendorResponsiveImageSources,
  isSeedPlaceholderUrl,
} from "../../lib/vendors/images.ts";

type VendorHeroImageProps = {
  imageUrl: string | null;
  storageObjectPath?: string | null;
  alt: string;
};

const heroImageSizes = "(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 640px";
const heroImageWidths = [480, 720, 960] as const;

export function VendorHeroImage({
  imageUrl,
  storageObjectPath = null,
  alt,
}: VendorHeroImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const responsiveSources = useMemo(
    () =>
      imageUrl
        ? buildVendorResponsiveImageSources(imageUrl, storageObjectPath, heroImageWidths, {
            height: 720,
            quality: 72,
            resize: "cover",
          })
        : null,
    [imageUrl, storageObjectPath],
  );

  if (!imageUrl || hasFailed || isSeedPlaceholderUrl(imageUrl)) {
    return <span>No image available</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      decoding="async"
      height={720}
      loading="lazy"
      sizes={heroImageSizes}
      src={responsiveSources?.src ?? imageUrl}
      srcSet={responsiveSources?.srcSet ?? undefined}
      width={960}
      onError={() => setHasFailed(true)}
    />
  );
}
