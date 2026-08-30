import type { Metadata } from "next";
import "./globals.css";
import OfflineRegister from "./OfflineRegister";

export const metadata: Metadata = {
  title: "🏴‍☠️ Mille Sabords By C. Guilhem",
  description: "Jeu de dés pirate — version numérique",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><OfflineRegister />{children}</body></html>;
}