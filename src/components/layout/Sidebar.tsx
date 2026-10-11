"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  LayoutDashboard,
  Monitor,
  Gamepad2,
  Clock,
  CalendarDays,
  ShoppingBag,
  Package,
  BarChart3,
  Settings,
  Wrench,
  Users,
  Flame,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "PC", href: "/pc", icon: Monitor },
  { label: "Console", href: "/consoles", icon: Gamepad2 },
  { label: "Games", href: "/games", icon: Flame },
  { label: "Sessions", href: "/sessions", icon: Clock },
  { label: "Booking", href: "/booking", icon: CalendarDays },
  { label: "Members", href: "/members", icon: Users },
  { label: "Store", href: "/store", icon: ShoppingBag },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        throw new Error("logout failed");
      }
      setShowLogoutConfirm(false);
      setMobileOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Logout gagal. Sesi Anda belum berakhir, silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  const logoutModal = showLogoutConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-surface border border-surface-border rounded-md p-5 shadow-xl">
        <h2 className="text-base font-bold text-text-primary">Logout</h2>
        <p className="mt-2 text-sm text-text-secondary">Apakah Anda yakin ingin logout?</p>
        {logoutError && <p className="mt-3 text-sm text-red-600">{logoutError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(false)}
            disabled={loggingOut}
            className="px-3 py-2 text-sm font-semibold rounded-md border border-surface-border text-text-secondary hover:bg-surface-hover"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3 py-2 text-sm font-semibold rounded-md bg-orange text-white disabled:opacity-60"
          >
            {loggingOut ? "Keluar..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const nav = (
    <>
      <div className="h-14 flex items-center px-4 border-b border-surface-border gap-3">
        <div className="pixel-mark scale-75"></div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-black tracking-wider text-maroon uppercase">
            DREAMCAFÉ
          </span>
          <span className="text-[10px] text-text-muted font-mono">Retail</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
                isActive
                  ? "bg-orange text-white shadow-sm"
                  : "text-text-secondary hover:text-orange hover:bg-surface-hover"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-white" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-surface-border space-y-1">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
            pathname === "/settings"
              ? "bg-orange text-white shadow-sm"
              : "text-text-secondary hover:text-orange hover:bg-surface-hover"
          }`}
        >
          <Settings className={`w-[18px] h-[18px] shrink-0 ${pathname === "/settings" ? "text-white" : ""}`} />
          <span>Settings</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-semibold text-text-secondary hover:text-orange hover:bg-surface-hover transition-all"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 bg-surface border border-surface-border rounded-md shadow-sm text-orange hover:bg-surface-hover transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside className="hidden lg:flex w-56 bg-surface border-r border-surface-border flex-col shrink-0 h-screen sticky top-0">
        {nav}
      </aside>
      {logoutModal}

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-text-primary/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-0 left-0 w-64 h-screen bg-surface border-r border-surface-border flex flex-col z-40 lg:hidden shadow-xl">
            {nav}
          </aside>
        </>
      )}
    </>
  );
};
