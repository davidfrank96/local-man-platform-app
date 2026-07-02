import type { Metadata, Viewport } from "next";
import { AppShell } from "../components/system/app-shell.tsx";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./admin-rider-workspace.css";

export const metadata: Metadata = {
  title: "The Local Man",
  applicationName: "Localman",
  description:
    "Map-based local food discovery for underrepresented vendors in Abuja.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Localman",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#13733D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <div id="main-content">{children}</div>
        </AppShell>
      </body>
    </html>
  );
}
