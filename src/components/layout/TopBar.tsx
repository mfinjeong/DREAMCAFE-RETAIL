"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LogOut, User, Key } from "lucide-react";

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
  "/profile": "Profil Akun",
};

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [logoutError, setLogoutError] = useState("");
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
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      setCurrentUser(null);
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout gagal:", err);
      const msg = err instanceof Error ? err.message : "Logout gagal. Silakan coba lagi.";
      setLogoutError(msg);
    } finally {
      setIsLoggingOut(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
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
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="flex items-center gap-2 p-1.5 text-text-secondary hover:text-orange hover:bg-surface-hover rounded-md transition-colors"
                aria-haspopup="menu"
                aria-expanded={showMenu}
              >
                <span className="hidden lg:block text-right">
                  <span className="block text-xs font-semibold text-text-primary">{currentUser.fullName}</span>
                  <span className="block text-xs text-text-muted">{currentUser.role}</span>
                </span>
                <User className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 bg-surface border border-surface-border rounded-[6px] shadow-lg z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-surface-border lg:hidden">
                      <div className="text-xs font-semibold text-text-primary">{currentUser.fullName}</div>
                      <div className="text-xs text-text-muted">{currentUser.role}</div>
                    </div>
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profil
                    </Link>
                    <Link
                      href="/profile?tab=password"
                      role="menuitem"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Ganti Password
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        setShowConfirm(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors border-t border-surface-border"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-surface border border-surface-border rounded-[6px] p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-base font-bold text-text-primary mb-2">Konfirmasi Logout</h2>
            <p className="text-sm text-text-muted mb-4">Apakah Anda yakin ingin keluar dari akun ini?</p>
            {logoutError && (
              <div className="mb-4 p-2 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded">
                {logoutError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-hover rounded-md transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
              >
                {isLoggingOut ? "Memproses..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
