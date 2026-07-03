import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import {
  SESSION_COOKIE,
  adminAuthEnabled,
  expectedToken,
} from "@/lib/auth";
import LogoutButton from "./components/LogoutButton";

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
  let loggedIn = false;
  if (adminAuthEnabled()) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const expected = await expectedToken();
    loggedIn = !!token && !!expected && token === expected;
  }

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
                href="/admin/rotation"
                className="hover:text-accent transition-colors"
              >
                Rotation
              </Link>
              <Link
                href="/admin"
                className="rounded bg-accent px-3 py-1.5 text-white hover:opacity-90 transition"
              >
                + Add Lineup
              </Link>
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
