import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: "DREAMCAFÉ - Gaming Center Management & Community Platform",
  description:
    "Stylish cyber cafe, PC/console station management, live billing, cash POS, inventory, bookings, and esports community platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-background text-[#F2F3F5] antialiased selection:bg-persona-red selection:text-white">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
