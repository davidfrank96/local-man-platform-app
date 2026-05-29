"use client";

import Image from "next/image";

type LocalmanRecoveryFallbackProps = {
  onReload?: () => void;
};

export function LocalmanRecoveryFallback({ onReload }: LocalmanRecoveryFallbackProps) {
  const handleReload = onReload ?? (() => window.location.reload());

  return (
    <div className="global-error-fallback" role="alert">
      <div className="localman-recovery-card">
        <Image
          alt=""
          className="localman-recovery-logo"
          height={72}
          src="/icons/pwa-192x192.png"
          width={72}
        />
        <h1>Localman needs to reload to continue.</h1>
        <p>Your live marketplace data will refresh when the app reloads.</p>
        <button className="button-primary" type="button" onClick={handleReload}>
          Reload Localman
        </button>
      </div>
    </div>
  );
}
