"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Plus,
  RefreshCw,
  AlertTriangle,
  Power,
  PowerOff,
  Wrench,
  ArrowDownToLine,
  ArrowUpFromLine,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SharingAccount {
  id: string;
  accountCode: string;
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OFFLINE";
  isActive: boolean;
  gameId: string;
  notes: string | null;
  createdAt: string;
  activeAllocation: {
    id: string;
    sessionId: string;
    session: { sessionNumber: number; pc: { name: string } | null; console: { name: string } | null } | null;
  } | null;
}

interface ActiveSession {
  id: string;
  sessionNumber: number;
  stationName: string;
}

interface Props {
  gameId: string;
  gameTitle: string;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-950 text-emerald-400 border-emerald-800",
  IN_USE: "bg-orange/15 text-orange border-orange/30",
  MAINTENANCE: "bg-yellow-950 text-yellow-400 border-yellow-800",
  OFFLINE: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  IN_USE: "Digunakan",
  MAINTENANCE: "Maintenance",
  OFFLINE: "Offline",
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Gagal memuat data");
  return data;
}

export default function SharingAccountsPanel({ gameId, gameTitle }: Props) {
  const [accounts, setAccounts] = useState<SharingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Allocate picker
  const [allocatingAccountId, setAllocatingAccountId] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/games/sharing-accounts?gameId=${encodeURIComponent(gameId)}`);
      setAccounts(data.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat akun sharing");
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (accountId: string, status: "AVAILABLE" | "MAINTENANCE" | "OFFLINE") => {
    setActionLoading(accountId);
    setActionError(null);
    try {
      await apiFetch(`/api/games/sharing-accounts/${accountId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal mengubah status");
    } finally {
      setActionLoading(null);
    }
  };

  const openAllocatePicker = async (accountId: string) => {
    setAllocatingAccountId(accountId);
    setSessionsLoading(true);
    setActionError(null);
    try {
      const data = await apiFetch(`/api/sessions?status=ACTIVE&gameId=${encodeURIComponent(gameId)}`);
      const sessions = (data.data as ActiveSession[] | undefined || []).map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        stationName: s.stationName || "Unknown",
      }));
      setActiveSessions(sessions);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal memuat sesi aktif");
      setAllocatingAccountId(null);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleAllocate = async (sessionId: string) => {
    if (!allocatingAccountId) return;
    setActionLoading(allocatingAccountId);
    setActionError(null);
    try {
      await apiFetch(`/api/games/sharing-accounts/${allocatingAccountId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setAllocatingAccountId(null);
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal mengalokasikan akun");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (accountId: string) => {
    setActionLoading(accountId);
    setActionError(null);
    try {
      await apiFetch(`/api/games/sharing-accounts/${accountId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal melepas alokasi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim()) return;
    setAddSubmitting(true);
    setActionError(null);
    try {
      await apiFetch("/api/games/sharing-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          accountCode: addCode.trim(),
          status: "AVAILABLE",
          notes: addNotes.trim() || null,
        }),
      });
      setAddCode("");
      setAddNotes("");
      setShowAddForm(false);
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal menambah akun");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleToggleActive = async (account: SharingAccount) => {
    if (account.status === "IN_USE") {
      setActionError("Tidak dapat menonaktifkan akun yang sedang digunakan");
      return;
    }
    setActionLoading(account.id);
    setActionError(null);
    try {
      await apiFetch(`/api/games/sharing-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Gagal mengubah status aktif");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="border-t border-surface-border pt-4 mt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-persona-blue" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-secondary">
            Akun Sharing — {gameTitle}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-dark border border-surface-border rounded text-text-muted">
            {accounts.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {actionError && (
            <div className="p-2 bg-maroon-subtle border border-maroon-border rounded text-xs text-maroon font-semibold">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {actionError}
            </div>
          )}

          {isLoading ? (
            <div className="py-6 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-secondary">Memuat akun sharing…</p>
            </div>
          ) : accounts.length === 0 && !showAddForm ? (
            <div className="py-6 text-center bg-surface-dark border border-surface-border rounded">
              <KeyRound className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-secondary font-medium">
                Belum ada akun sharing untuk game ini.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-xs text-persona-blue hover:underline font-semibold"
              >
                + Tambah Akun
              </button>
            </div>
          ) : (
            <>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-xs text-persona-blue hover:underline font-semibold"
                >
                  <Plus className="w-3 h-3" /> Tambah Akun
                </button>
              )}

              {showAddForm && (
                <form onSubmit={handleAddAccount} className="p-3 bg-surface-dark border border-surface-border rounded space-y-2">
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Account Code *"
                      value={addCode}
                      onChange={(e) => setAddCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-muted border border-surface-border rounded text-text-primary focus:outline-none focus:border-persona-blue"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-muted border border-surface-border rounded text-text-primary focus:outline-none focus:border-persona-blue"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={addSubmitting || !addCode.trim()}>
                      {addSubmitting ? "Menambah…" : "Tambah"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false);
                        setAddCode("");
                        setAddNotes("");
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-3 bg-surface-dark border rounded flex items-start justify-between gap-3 ${
                      account.isActive ? "border-surface-border" : "border-zinc-700 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-primary font-semibold truncate">
                          {account.accountCode}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[account.status]}`}
                        >
                          {STATUS_LABELS[account.status]}
                        </span>
                        {!account.isActive && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-zinc-800 text-zinc-400 border-zinc-700">
                            NONAKTIF
                          </span>
                        )}
                      </div>
                      {account.notes && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{account.notes}</p>
                      )}
                      {account.activeAllocation?.session && (
                        <p className="text-[10px] text-text-muted mt-1 font-mono">
                          Sesi #{account.activeAllocation.session.sessionNumber}
                          {account.activeAllocation.session.pc?.name && ` — ${account.activeAllocation.session.pc.name}`}
                          {account.activeAllocation.session.console?.name && ` — ${account.activeAllocation.session.console.name}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {account.status === "IN_USE" && (
                        <button
                          onClick={() => handleRelease(account.id)}
                          disabled={actionLoading === account.id}
                          className="p-1.5 text-text-secondary hover:text-emerald-400 hover:bg-surface-muted rounded transition-colors"
                          title="Lepas alokasi"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {account.status === "AVAILABLE" && account.isActive && (
                        <button
                          onClick={() => openAllocatePicker(account.id)}
                          disabled={actionLoading === account.id}
                          className="p-1.5 text-text-secondary hover:text-persona-blue hover:bg-surface-muted rounded transition-colors"
                          title="Alokasikan ke sesi"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {account.status !== "IN_USE" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(account.id, "MAINTENANCE")}
                            disabled={actionLoading === account.id}
                            className="p-1.5 text-text-secondary hover:text-yellow-400 hover:bg-surface-muted rounded transition-colors"
                            title="Set Maintenance"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(account.id, "OFFLINE")}
                            disabled={actionLoading === account.id}
                            className="p-1.5 text-text-secondary hover:text-zinc-300 hover:bg-surface-muted rounded transition-colors"
                            title="Set Offline"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleToggleActive(account)}
                        disabled={actionLoading === account.id}
                        className={`p-1.5 rounded transition-colors ${
                          account.isActive
                            ? "text-text-secondary hover:text-maroon hover:bg-surface-muted"
                            : "text-text-muted hover:text-emerald-400 hover:bg-surface-muted"
                        }`}
                        title={account.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
                      >
                        {account.isActive ? (
                          <PowerOff className="w-3.5 h-3.5" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {allocatingAccountId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-surface-dark border border-surface-border rounded-lg p-4 max-w-md w-full mx-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  Pilih Sesi Aktif untuk Game Ini
                </h3>
                {sessionsLoading ? (
                  <div className="py-6 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-text-muted mx-auto mb-2" />
                    <p className="text-xs text-text-secondary">Memuat sesi aktif…</p>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-text-secondary">Tidak ada sesi aktif untuk game ini.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleAllocate(session.id)}
                        disabled={!!actionLoading}
                        className="w-full p-2 bg-surface-muted border border-surface-border rounded text-left hover:border-persona-blue transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-text-primary">
                            Sesi #{session.sessionNumber}
                          </span>
                          <span className="text-xs text-text-muted">{session.stationName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAllocatingAccountId(null);
                      setActiveSessions([]);
                    }}
                    disabled={!!actionLoading}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={load}
              disabled={isLoading}
              className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
