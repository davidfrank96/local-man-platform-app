import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
