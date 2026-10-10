"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut } from "lucide-react";

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
  "/login": "Login",
};

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);
  const title = pageTitles[pathname] || "Dashboard";

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setCurrentUser(data.data);
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      setCurrentUser(null);
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout gagal:", err);
    }
  }

  return (
    <header className="h-14 bg-surface border-b border-surface-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="hidden lg:block w-1 h-6 bg-orange rounded-sm"></div>
        <h1 className="text-base lg:text-lg font-extrabold text-maroon tracking-tight ml-12 lg:ml-0">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block w-56">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-md pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-orange transition-colors"
          />
        </div>
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-text-primary">{currentUser.fullName}</div>
              <div className="text-xs text-text-muted">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-secondary hover:text-orange hover:bg-surface-hover rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
