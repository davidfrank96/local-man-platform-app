import type { Metadata } from "next";
import { AppShell } from "../components/system/app-shell.tsx";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Local Man",
  description:
    "Map-based local food discovery for underrepresented vendors in Abuja.",
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
