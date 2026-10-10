"use client";

import React from "react";
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

  return (
    <aside className="w-52 bg-surface-muted border-r border-surface-border flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-12 flex items-center px-4 border-b border-surface-border gap-2">
        <div className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></div>
        <span className="text-xs font-black tracking-widest text-[#F2F3F5] uppercase">
          DREAM<span className="text-persona-red">CAFÉ</span>
        </span>
        <span className="text-[9px] font-mono text-text-muted border border-surface-border px-1 py-0.5 rounded-[2px] ml-auto">
          v2.4
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors duration-100 ${
                isActive
                  ? "bg-persona-red-subtle text-white border border-persona-red-border/70 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-persona-red before:rounded-l-[2px]"
                  : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-persona-red" : "text-text-muted"
                }`}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1 h-2 bg-persona-red persona-slash"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings at the bottom */}
      <div className="p-2.5 border-t border-surface-border">
        <Link
          href="/settings"
          className={`relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors duration-100 ${
            pathname === "/settings"
              ? "bg-persona-red-subtle text-white border border-persona-red-border/70 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-persona-red before:rounded-l-[2px]"
              : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              pathname === "/settings" ? "text-persona-red" : "text-text-muted"
            }`}
          />
          <span>Settings</span>
          {pathname === "/settings" && (
            <span className="ml-auto w-1 h-2 bg-persona-red persona-slash"></span>
          )}
        </Link>
      </div>
    </aside>
  );
};
