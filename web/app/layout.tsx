import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { adminAuthEnabled } from "@/lib/auth";
import { canManage } from "@/lib/session";
import HeaderNav from "./components/HeaderNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const valorant = localFont({
  src: "./fonts/Valorant.ttf",
  variable: "--font-valorant",
  display: "swap",
});

// Base URL so relative OpenGraph/Twitter image paths resolve to absolute URLs
// when links are unfurled (Discord, etc.). Falls back to localhost in dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "brimmybuddy",
  description: "Browse Valorant lineups by map and agent.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const manage = await canManage();
  // Only surface the logout button when a real password gate is active.
  const loggedIn = adminAuthEnabled() && manage;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${valorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-panel-border bg-panel/60 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="shrink-0 font-display text-xl tracking-widest sm:text-2xl"
            >
              <span className="text-accent">brimmy</span>buddy
            </Link>
            <HeaderNav manage={manage} loggedIn={loggedIn} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-panel-border py-6 text-center text-xs text-foreground/40">
          Fan-made lineups tool. Not affiliated with Riot Games.
        </footer>
      </body>
    </html>
  );
}
