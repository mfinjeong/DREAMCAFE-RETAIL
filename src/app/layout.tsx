import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const rawPathname = h.get("x-pathname");
  // Validate x-pathname: must start with / and not be a protocol URL or empty
  // Defensive to prevent header injection even though middleware overwrites it
  let pathname = "/";
  if (rawPathname && rawPathname.startsWith("/") && !rawPathname.includes("://")) {
    pathname = rawPathname;
  }

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/sign-up");

  if (!isAuthRoute) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        redirect(`/login?from=${encodeURIComponent(pathname)}`);
      }
    } catch (error) {
      // DB connection failure: log and return 503 without exposing internals
      if (error instanceof Error && error.message === "AUTH_DB_ERROR") {
        console.error("Layout auth check failed: database unavailable");
        return (
          <html lang="id">
            <body className="bg-background text-text-primary min-h-screen flex items-center justify-center p-4">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-semibold">Layanan Tidak Tersedia</h1>
                <p className="text-text-secondary">
                  Sistem sedang mengalami gangguan koneksi. Coba lagi sebentar lagi.
                </p>
              </div>
            </body>
          </html>
        );
      }
      throw error;
    }
  }

  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${pressStart2P.variable}`}>
      <body className="bg-background text-text-primary antialiased selection:bg-orange selection:text-white font-sans">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
