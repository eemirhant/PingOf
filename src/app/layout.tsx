import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import iconVersion from "../../public/icons/icon-version.json";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

/** Bust browser/PWA icon caches when brand assets are regenerated. */
const ICON_V = iconVersion.version;

export const metadata: Metadata = {
  title: "PingOf — Ofis Masa Tenisi",
  description:
    "Ofis masa tenisi maçlarınızı, turnuvalarınızı ve istatistiklerinizi takip edin.",
  applicationName: "PingOf",
  manifest: `/manifest.webmanifest?v=${ICON_V}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PingOf",
  },
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_V}`, sizes: "any" },
      {
        url: `/icons/icon-192.png?v=${ICON_V}`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: `/icons/icon-512.png?v=${ICON_V}`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `/icons/apple-touch-icon.png?v=${ICON_V}`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0b0f" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
