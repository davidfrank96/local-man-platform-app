"use client";

import { useState } from "react";
import { isSeedPlaceholderUrl } from "../../lib/vendors/images.ts";

type VendorHeroImageProps = {
  imageUrl: string | null;
  alt: string;
};

export function VendorHeroImage({ imageUrl, alt }: VendorHeroImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

  if (!imageUrl || hasFailed || isSeedPlaceholderUrl(imageUrl)) {
    return <span>No image available</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={imageUrl} onError={() => setHasFailed(true)} />
  );
}
