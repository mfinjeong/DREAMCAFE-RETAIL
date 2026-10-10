import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";

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
    <html lang="id">
      <body className="bg-background text-text-primary antialiased selection:bg-coffee selection:text-white">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
