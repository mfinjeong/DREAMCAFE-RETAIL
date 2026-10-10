"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard Overview",
  "/pc": "PC Management",
  "/consoles": "Console Lounge",
  "/sessions": "Active Sessions",
  "/booking": "Reservations",
  "/store": "Store & POS",
  "/inventory": "Inventory & Stock",
  "/members": "Members Directory",
  "/games": "Game Library",
  "/maintenance": "Maintenance & Support",
  "/reports": "Financial Reports",
  "/settings": "System Settings",
};

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="h-12 bg-surface-muted border-b border-surface-border px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Page Title with small red diagonal accent */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
        <h1 className="text-xs font-bold text-[#F2F3F5] tracking-wide font-sans">
          {title}
        </h1>
      </div>

      {/* Right: Search, Notifications, Admin Profile */}
      <div className="flex items-center gap-2.5">
        <div className="relative hidden md:block w-48">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stations, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red transition-colors"
          />
        </div>

        <button
          className="p-1.5 rounded-[6px] text-text-secondary hover:text-[#F2F3F5] hover:bg-surface transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-persona-red absolute top-1.5 right-1.5"></span>
        </button>

        <div className="h-3.5 w-px bg-surface-border"></div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <div className="w-6 h-6 rounded-[4px] bg-surface border border-surface-border flex items-center justify-center text-text-secondary">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-[#F2F3F5] text-xs font-semibold hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
};
