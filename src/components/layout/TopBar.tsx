"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pc": "PC Stations",
  "/consoles": "Console Lounge",
  "/sessions": "Active Sessions",
  "/booking": "Reservations",
  "/store": "Store & POS",
  "/inventory": "Inventory",
  "/members": "Members",
  "/games": "Game Library",
  "/maintenance": "Maintenance",
  "/reports": "Reports",
  "/settings": "Settings",
};

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="h-14 bg-surface border-b border-surface-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="hidden lg:block w-1 h-6 bg-coffee rounded-sm"></div>
        <h1 className="text-base lg:text-lg font-bold text-coffee tracking-tight ml-12 lg:ml-0">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block w-56">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-md pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-sage transition-colors"
          />
        </div>

        <button
          className="p-2 rounded-md text-text-secondary hover:text-coffee hover:bg-surface-hover transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-pamber absolute top-1.5 right-1.5"></span>
        </button>

        <div className="h-5 w-px bg-surface-border hidden sm:block"></div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-coffee-subtle border border-coffee-border flex items-center justify-center">
            <User className="w-4 h-4 text-coffee" />
          </div>
          <span className="text-sm font-medium text-text-primary hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
};
