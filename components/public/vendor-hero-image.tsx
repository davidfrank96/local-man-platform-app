"use client";

import { useState } from "react";
import { isSeedPlaceholderUrl } from "../../lib/vendors/images.ts";

type VendorHeroImageProps = {
  imageUrl: string | null;
  storageObjectPath?: string | null;
  alt: string;
};

const heroImageSizes = "(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 640px";

export function VendorHeroImage({
  imageUrl,
  alt,
}: VendorHeroImageProps) {
  const [hasOriginalFailed, setHasOriginalFailed] = useState(false);
  const isValidHttpImageUrl =
    typeof imageUrl === "string" &&
    imageUrl.startsWith("http") &&
    !isSeedPlaceholderUrl(imageUrl);

  if (!isValidHttpImageUrl) {
    return <span>No image available</span>;
  }

  if (hasOriginalFailed) {
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
      src={imageUrl}
      width={960}
      onError={() => setHasOriginalFailed(true)}
    />
  );
}
