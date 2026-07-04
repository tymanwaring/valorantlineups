import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { adminAuthEnabled } from "@/lib/auth";
import { canManage } from "@/lib/session";
import LogoutButton from "./components/LogoutButton";
import AddLineupButton from "./components/AddLineupButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const valorant = localFont({
  src: "./fonts/Valorant.ttf",
  variable: "--font-valorant",
  display: "swap",
});

export const metadata: Metadata = {
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
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-display text-2xl tracking-widest">
              <span className="text-accent">brimmy</span>buddy
            </Link>
            <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-accent transition-colors">
                Maps
              </Link>
              <Link
                href="/favorites"
                className="hover:text-accent transition-colors"
              >
                Favorites
              </Link>
              {manage && (
                <Link
                  href="/admin/rotation"
                  className="hover:text-accent transition-colors"
                >
                  Rotation
                </Link>
              )}
              {manage && (
                <AddLineupButton className="rounded bg-accent px-3 py-1.5 text-white hover:opacity-90 transition" />
              )}
              {loggedIn && <LogoutButton />}
            </nav>
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
