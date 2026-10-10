import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DREAMCAFÉ - Retail Management",
  description:
    "PC and console station management, live billing, cash POS, inventory, bookings, and operational reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${pressStart2P.variable}`}>
      <body className="bg-background text-text-primary antialiased selection:bg-coffee selection:text-white font-sans">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
