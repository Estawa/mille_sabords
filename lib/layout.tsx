import type { Metadata } from "next";
import "./globals.css";
import OfflineRegister from "./OfflineRegister";

export const metadata: Metadata = {
  title: "🏴‍☠️ Mille Sabords By C. Guilhem",
  description: "Jeu de dés pirate — version numérique",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><OfflineRegister />{children}</body></html>;
}