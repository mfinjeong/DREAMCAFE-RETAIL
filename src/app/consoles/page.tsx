"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ConsoleStation, ConsoleType, ConsoleStatus, MemberItem } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StartSessionModal } from "@/components/modals/StartSessionModal";
import { EndSessionPaymentModal } from "@/components/modals/EndSessionPaymentModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatRupiah } from "@/lib/formatters";
import { Plus, Search, Edit2, Trash2, Play, Square, DollarSign, RefreshCw, AlertTriangle, Gamepad2 } from "lucide-react";

export default function ConsolesPage() {
  const [consoles, setConsoles] = useState<ConsoleStation[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<"start" | "end" | "edit" | null>(null);
  const [selectedConsole, setSelectedConsole] = useState<ConsoleStation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    durationMinutes: number;
    totalAmount: number;
  } | null>(null);

  // Form data for Create / Edit Console
  const [formData, setFormData] = useState({
    id: "",
    stationNumber: "",
    name: "",
    consoleType: "PS5" as ConsoleType,
    status: "AVAILABLE" as ConsoleStatus,
    hourlyRate: 20000,
    controllersCount: 2,
    specsDisplay: "LG C3 55\" 4K 120Hz OLED",
    installedGamesText: "EA Sports FC 24, Tekken 8, Spider-Man 2",
  });

  // Fetch consoles with backend filtering and search
  const fetchConsoles = useCallback(async (query: string, type: string, status: string) => {
    try {
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (type !== "ALL") params.set("type", type);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/consoles?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load console stations from database");
      }
      setConsoles(json.data);
    } catch (e: unknown) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "Database fetch failed");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch members for starting sessions
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMembers(json.data);
      }
    } catch (e) {
      console.error("Failed to load members:", e);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Debounced search and filter execution via backend service
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConsoles(searchQuery, selectedType, selectedStatus);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedType, selectedStatus, fetchConsoles]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchConsoles(searchQuery, selectedType, selectedStatus);
  };

  // CRUD Handlers
  const handleOpenCreate = () => {
    setIsEditing(false);
    setActionError(null);
    setFormData({
      id: "",
      stationNumber: `CON ${(consoles.length + 1).toString().padStart(2, "0")}`,
      name: `PlayStation 5 Lounge ${(consoles.length + 1).toString().padStart(2, "0")}`,
      consoleType: "PS5",
      status: "AVAILABLE",
      hourlyRate: 20000,
      controllersCount: 2,
      specsDisplay: "LG C3 55\" 4K 120Hz OLED",
      installedGamesText: "EA Sports FC 24, Tekken 8, Spider-Man 2",
    });
    setActiveModal("edit");
  };

  const handleOpenEdit = (con: ConsoleStation) => {
    setIsEditing(true);
    setActionError(null);
    setFormData({
      id: con.id,
      stationNumber: con.stationNumber,
      name: con.name,
      consoleType: con.consoleType,
      status: con.status,
      hourlyRate: con.hourlyRate,
      controllersCount: con.controllersCount,
      specsDisplay: con.specsDisplay,
      installedGamesText: con.installedGames.join(", "),
    });
    setActiveModal("edit");
  };

  const handleSaveConsole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const installedGames = formData.installedGamesText
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    const payload = {
      stationNumber: formData.stationNumber,
      name: formData.name,
      consoleType: formData.consoleType,
      status: formData.status,
      hourlyRate: Number(formData.hourlyRate),
      controllersCount: Number(formData.controllersCount),
      specsDisplay: formData.specsDisplay,
      installedGames,
    };

    try {
      const url = isEditing ? `/api/consoles/${formData.id}` : "/api/consoles";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setActionError(json.message);
        return;
      }

      setActiveModal(null);
      await fetchConsoles(searchQuery, selectedType, selectedStatus);
    } catch {
      setActionError("Failed to save console station.");
    }
  };

  const handleDeleteConsole = async (id: string, stationNumber: string) => {
    if (!confirm(`Delete console ${stationNumber}?`)) return;

    try {
      const res = await fetch(`/api/consoles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        alert(json.message);
        return;
      }
      await fetchConsoles(searchQuery, selectedType, selectedStatus);
    } catch {
      alert("Failed to delete console station.");
    }
  };

  const handleStatusChange = async (consoleId: string, newStatus: ConsoleStatus) => {
    try {
      const res = await fetch(`/api/consoles/${consoleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      await fetchConsoles(searchQuery, selectedType, selectedStatus);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update console status");
    }
  };

  // Session Handlers
  const handleStartSession = (con: ConsoleStation) => {
    setSelectedConsole(con);
    setActiveModal("start");
  };

  const handleConfirmStart = async (payload: {
    stationId: string;
    type: "PC" | "CONSOLE";
    memberId?: string | null;
    guestName?: string | null;
    durationMinutes: number;
    currentGame?: string;
  }) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchConsoles(searchQuery, selectedType, selectedStatus);
  };

  const handleOpenCheckout = (con: ConsoleStation) => {
    if (!con.activeSession) return;
    setCheckoutData({
      id: con.activeSession.id,
      stationNumber: con.stationNumber,
      userName: con.activeSession.memberName || con.activeSession.guestName || "Guest",
      durationMinutes: con.activeSession.durationMinutes,
      totalAmount: con.activeSession.totalPrice,
    });
    setActiveModal("end");
  };

  const handleConfirmEnd = async (payload: {
    sessionId: string;
    totalAmount: number;
    cashReceived: number;
  }) => {
    const res = await fetch("/api/sessions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchConsoles(searchQuery, selectedType, selectedStatus);
  };

  const handleStopSession = async (sessionId: string) => {
    const res = await fetch("/api/sessions/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchConsoles(searchQuery, selectedType, selectedStatus);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-p3r-blue persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Console Lounge Fleet
          </h2>
          <span className="text-[11px] font-mono text-text-secondary">
            ({consoles.length} stations loaded from database)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-p3r-blue" : ""
            }`}
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Console
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[8px] text-xs text-persona-red flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection Error: {errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchConsoles(searchQuery, selectedType, selectedStatus);
            }}
            className="px-2.5 py-1 bg-persona-red hover:bg-persona-red-hover text-white rounded-[4px] text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search console, TV specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-p3r-blue font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Platform filter buttons */}
          <div className="flex items-center gap-1">
            {["ALL", "PS5", "PS4", "SWITCH"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === t
                    ? "bg-p3r-blue text-white"
                    : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status filter dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="IN_USE">IN USE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="h-44 border border-surface-border rounded-[8px] bg-surface flex flex-col items-center justify-center gap-2 text-text-secondary text-xs font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-p3r-blue" />
          <span>Loading console stations from database...</span>
        </div>
      ) : consoles.length === 0 ? (
        <div className="h-32 border border-surface-border rounded-[8px] bg-surface flex items-center justify-center text-text-secondary text-xs font-mono">
          No console stations found matching filters
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {consoles.map((con) => (
            <div
              key={con.id}
              className="p-3.5 bg-surface border border-surface-border rounded-[8px] flex flex-col justify-between relative overflow-hidden select-none hover:border-surface-hover transition-colors"
            >
              {/* Corner badge reflecting status */}
              {con.status === "IN_USE" ? (
                <span
                  className="absolute top-0 right-0 w-3.5 h-3.5 bg-persona-red"
                  style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                  title="Active Session"
                />
              ) : con.status === "AVAILABLE" ? (
                <span
                  className="absolute top-0 right-0 w-3.5 h-3.5 bg-p3r-blue"
                  style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                  title="Available Console"
                />
              ) : con.status === "MAINTENANCE" ? (
                <span
                  className="absolute top-0 right-0 w-3.5 h-3.5 bg-pamber"
                  style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                  title="Under Maintenance"
                />
              ) : (
                <span
                  className="absolute top-0 right-0 w-3.5 h-3.5 bg-surface-border"
                  style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                />
              )}

              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-1.5 pr-2">
                  <div>
                    <span className="text-sm font-extrabold text-[#F2F3F5] font-sans block">
                      {con.stationNumber}
                    </span>
                    <span className="text-[11px] font-mono text-text-secondary truncate block max-w-[140px]">
                      {con.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded-[3px] text-p3r-blue font-bold">
                      {con.consoleType}
                    </span>
                    <StatusBadge status={con.status} />
                  </div>
                </div>

                {/* Specs Box */}
                <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px] my-2 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-text-secondary text-[11px]">
                    <span>Display:</span>
                    <span className="text-[#F2F3F5] truncate max-w-[130px] font-medium" title={con.specsDisplay}>
                      {con.specsDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary text-[11px]">
                    <span>Controllers:</span>
                    <span className="text-[#F2F3F5]">{con.controllersCount} Wireless</span>
                  </div>
                  <div className="flex justify-between text-text-secondary text-[11px]">
                    <span>Rate:</span>
                    <span className="text-[#F2F3F5] font-bold">{formatRupiah(con.hourlyRate)} / hr</span>
                  </div>
                </div>

                {/* Live Active Session Box (if IN_USE) */}
                {con.status === "IN_USE" && con.activeSession && (
                  <div className="p-2 bg-persona-red-subtle border border-persona-red-border rounded-[6px] my-2 text-xs font-mono space-y-0.5">
                    <div className="flex items-center justify-between text-persona-red font-bold text-[11px]">
                      <span className="truncate max-w-[120px]">
                        {con.activeSession.memberName || con.activeSession.guestName || "Guest"}
                      </span>
                      <span>{con.activeSession.remainingMinutes}m left</span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary text-[10px]">
                      <span className="truncate max-w-[120px]">
                        {con.currentGame || con.activeSession.currentGame || "Game"}
                      </span>
                      <span className="font-bold text-[#F2F3F5]">
                        {formatRupiah(con.activeSession.totalPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Installed Games Tags */}
                {con.installedGames && con.installedGames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {con.installedGames.map((g, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-surface-muted text-text-secondary border border-surface-border font-sans truncate max-w-[140px]"
                        title={g}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Station Actions Footer */}
              <div className="pt-2.5 border-t border-surface-border space-y-2">
                {/* Session Action */}
                <div>
                  {con.status === "AVAILABLE" ? (
                    <button
                      onClick={() => handleStartSession(con)}
                      className="w-full bg-persona-red hover:bg-persona-red-hover active:bg-persona-red-active text-white text-xs font-bold py-1.5 px-3 rounded-[6px] uppercase tracking-wider font-sans cursor-pointer transition-colors text-center"
                    >
                      START SESSION
                    </button>
                  ) : con.status === "IN_USE" && con.activeSession ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleOpenCheckout(con)}
                        className="bg-p3r-blue hover:bg-p3r-blue-hover active:bg-p3r-blue text-white text-[11px] font-bold py-1.5 px-2 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer text-center"
                        title="Checkout & Cash Pay"
                      >
                        CHECKOUT
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Stop active session on ${con.stationNumber}?`)) return;
                          try {
                            await handleStopSession(con.activeSession!.id);
                          } catch (err: unknown) {
                            alert(err instanceof Error ? err.message : "Failed to stop session");
                          }
                        }}
                        className="bg-surface-muted hover:bg-surface-hover text-persona-red border border-persona-red-border text-[11px] font-semibold py-1.5 px-2 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer text-center"
                        title="Stop Session"
                      >
                        STOP
                      </button>
                    </div>
                  ) : con.status === "MAINTENANCE" ? (
                    <div className="w-full bg-surface-muted border border-surface-border text-pamber text-xs py-1.5 px-3 rounded-[6px] text-center font-medium">
                      Under Maintenance
                    </div>
                  ) : (
                    <div className="w-full bg-surface-muted border border-surface-border text-text-muted text-xs py-1.5 px-3 rounded-[6px] text-center font-medium">
                      Station Offline
                    </div>
                  )}
                </div>

                {/* Console Management Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-border/60">
                  {/* Status Toggle Quick Selector */}
                  <select
                    value={con.status}
                    onChange={(e) => handleStatusChange(con.id, e.target.value as ConsoleStatus)}
                    disabled={con.status === "IN_USE"}
                    className="bg-surface-muted border border-surface-border rounded-[4px] px-1.5 py-1 text-[10px] text-text-secondary focus:outline-none cursor-pointer disabled:opacity-40"
                    title="Change station status"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(con)}
                      className="p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border cursor-pointer transition-colors"
                      title="Edit Console"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteConsole(con.id, con.stationNumber)}
                      className="p-1.5 text-persona-red hover:text-white bg-persona-red-subtle hover:bg-persona-red rounded-[4px] border border-persona-red-border cursor-pointer transition-colors disabled:opacity-30"
                      title="Delete Console"
                      disabled={con.status === "IN_USE"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Session Modal */}
      <StartSessionModal
        isOpen={activeModal === "start"}
        onClose={() => {
          setActiveModal(null);
          setSelectedConsole(null);
        }}
        station={selectedConsole}
        members={members}
        onConfirm={handleConfirmStart}
      />

      {/* End Session Payment Modal */}
      <EndSessionPaymentModal
        isOpen={activeModal === "end"}
        onClose={() => {
          setActiveModal(null);
          setCheckoutData(null);
        }}
        sessionData={checkoutData}
        onConfirmCheckout={handleConfirmEnd}
      />

      {/* Create / Edit Console Modal */}
      <Modal
        isOpen={activeModal === "edit"}
        onClose={() => setActiveModal(null)}
        title={isEditing ? `Edit ${formData.stationNumber}` : "New Console Station"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveConsole} className="space-y-3.5">
          {actionError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Station Number"
              placeholder="e.g. CON 05"
              value={formData.stationNumber}
              onChange={(e) => setFormData({ ...formData, stationNumber: e.target.value })}
              required
            />
            <Input
              label="Console Name / Lounge"
              placeholder="e.g. PlayStation 5 Lounge E"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Select
              label="Console Type"
              value={formData.consoleType}
              onChange={(e) => setFormData({ ...formData, consoleType: e.target.value as ConsoleType })}
              options={[
                { label: "PS5", value: "PS5" },
                { label: "PS4", value: "PS4" },
                { label: "SWITCH", value: "SWITCH" },
              ]}
            />
            <Input
              label="Rate / Hr (Rp)"
              type="number"
              step="1000"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
              required
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ConsoleStatus })}
              options={[
                { label: "AVAILABLE", value: "AVAILABLE" },
                { label: "MAINTENANCE", value: "MAINTENANCE" },
                { label: "OFFLINE", value: "OFFLINE" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Controllers Count"
              type="number"
              min="1"
              max="8"
              value={formData.controllersCount}
              onChange={(e) => setFormData({ ...formData, controllersCount: Number(e.target.value) })}
              required
            />
            <Input
              label="TV / Display Specs"
              placeholder={'e.g. Sony Bravia XR 55" 4K 120Hz OLED'}
              value={formData.specsDisplay}
              onChange={(e) => setFormData({ ...formData, specsDisplay: e.target.value })}
              required
            />
          </div>

          <Input
            label="Installed Games (comma separated)"
            placeholder="e.g. EA Sports FC 24, Tekken 8, Mortal Kombat 1"
            value={formData.installedGamesText}
            onChange={(e) => setFormData({ ...formData, installedGamesText: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Station
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
