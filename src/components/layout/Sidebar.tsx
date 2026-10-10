"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="h-14 flex items-center px-4 border-b border-surface-border gap-3">
        <div className="pixel-mark scale-75"></div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-bold tracking-wide text-coffee">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-coffee text-white shadow-sm"
                  : "text-text-secondary hover:text-coffee hover:bg-surface-hover"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-white" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-surface-border">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "bg-coffee text-white shadow-sm"
              : "text-text-secondary hover:text-coffee hover:bg-surface-hover"
          }`}
        >
          <Settings className={`w-[18px] h-[18px] shrink-0 ${pathname === "/settings" ? "text-white" : ""}`} />
          <span>Settings</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 bg-surface border border-surface-border rounded-md shadow-sm text-coffee hover:bg-surface-hover transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside className="hidden lg:flex w-56 bg-surface border-r border-surface-border flex-col shrink-0 h-screen sticky top-0">
        {nav}
      </aside>

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
