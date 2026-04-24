"use client";

import { useState } from "react";

type VendorHeroImageProps = {
  imageUrl: string | null;
  alt: string;
};

function isSeedPlaceholderUrl(imageUrl: string): boolean {
  return imageUrl.startsWith("/seed-images/");
}

export function VendorHeroImage({ imageUrl, alt }: VendorHeroImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

  if (!imageUrl || hasFailed || isSeedPlaceholderUrl(imageUrl)) {
    return <span>No photo added yet</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={imageUrl} onError={() => setHasFailed(true)} />
  );
}
