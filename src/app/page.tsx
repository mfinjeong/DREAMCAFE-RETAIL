"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PCStation, MemberItem, PCStatus } from "@/lib/types";
import { PCStationCard } from "@/components/cards/PCStationCard";
import { StartSessionModal } from "@/components/modals/StartSessionModal";
import { EndSessionPaymentModal } from "@/components/modals/EndSessionPaymentModal";
import { AddSessionTimeModal } from "@/components/modals/AddSessionTimeModal";
import { PCDetailModal } from "@/components/modals/PCDetailModal";
import { formatRupiah } from "@/lib/formatters";
import { RefreshCw, AlertTriangle, Activity, DollarSign } from "lucide-react";

export default function DashboardPage() {
  const [pcs, setPcs] = useState<PCStation[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [activeModal, setActiveModal] = useState<"start" | "end" | "addTime" | "detail" | null>(null);
  const [selectedPC, setSelectedPC] = useState<PCStation | null>(null);
  const [endSessionData, setEndSessionData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    durationMinutes: number;
    totalAmount: number;
  } | null>(null);
  const [addTimeSessionData, setAddTimeSessionData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    remainingMinutes: number;
    hourlyRate: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [pcRes, memRes, reportRes, sessionRes] = await Promise.all([
        fetch("/api/pc"),
        fetch("/api/members"),
        fetch("/api/reports"),
        fetch("/api/sessions?status=ACTIVE"),
      ]);

      const [pcJson, memJson, reportJson, sessionJson] = await Promise.all([
        pcRes.json(),
        memRes.json(),
        reportRes.json(),
        sessionRes.json(),
      ]);

      if (!pcRes.ok || !pcJson.success) {
        throw new Error(pcJson.message || "Failed to load PC stations from database");
      }
      setPcs(pcJson.data);

      if (memJson.success && Array.isArray(memJson.data)) {
        setMembers(memJson.data);
      }

      if (reportJson.success && reportJson.data) {
        setTodayRevenue(reportJson.data.todayRevenue || 0);
      }

      if (sessionJson.success && Array.isArray(sessionJson.data)) {
        setActiveSessionsCount(sessionJson.data.length);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Database connection error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  // Real database statistics
  const totalPC = pcs.length;
  const inUseCount = pcs.filter((p) => p.status === "IN_USE").length;
  const availableCount = pcs.filter((p) => p.status === "AVAILABLE").length;
  const maintenanceCount = pcs.filter((p) => p.status === "MAINTENANCE").length;
  const offlineCount = pcs.filter((p) => p.status === "OFFLINE").length;
  const liveActiveSessions = Math.max(activeSessionsCount, inUseCount);

  const filteredPCs = pcs.filter((p) => {
    if (selectedZone !== "ALL" && p.zone !== selectedZone) return false;
    if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false;
    return true;
  });

  const handleOpenStartSession = (pc: PCStation) => {
    setSelectedPC(pc);
    setActiveModal("start");
  };

  const handleOpenDetail = (pc: PCStation) => {
    setSelectedPC(pc);
    setActiveModal("detail");
  };

  const handleOpenEndSession = (pc: PCStation) => {
    if (!pc.activeSession) return;
    setEndSessionData({
      id: pc.activeSession.id,
      stationNumber: pc.stationNumber,
      userName: pc.activeSession.memberName || pc.activeSession.guestName || "Guest",
      durationMinutes: pc.activeSession.durationMinutes,
      totalAmount: pc.activeSession.totalPrice,
    });
    setActiveModal("end");
  };

  const handleOpenAddTime = (pc: PCStation) => {
    if (!pc.activeSession) return;
    setAddTimeSessionData({
      id: pc.activeSession.id,
      stationNumber: pc.stationNumber,
      userName: pc.activeSession.memberName || pc.activeSession.guestName || "Guest",
      remainingMinutes: pc.activeSession.remainingMinutes,
      hourlyRate: pc.hourlyRate,
    });
    setActiveModal("addTime");
  };

  const handleConfirmStartSession = async (payload: {
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
    await fetchData();
  };

  const handleConfirmEndSession = async (payload: {
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
    await fetchData();
  };

  const handleStopSession = async (sessionId: string) => {
    const res = await fetch("/api/sessions/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchData();
  };

  const handleConfirmAddTime = async (sessionId: string, additionalMinutes: number) => {
    const res = await fetch("/api/sessions/add-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, additionalMinutes }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchData();
  };

  const handleStatusChange = async (pcId: string, newStatus: PCStatus) => {
    const res = await fetch(`/api/pc/${pcId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchData();
    setActiveModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Statistics: PC Fleet Status (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* TOTAL PC */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-surface-border"></span>
          <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold">
            TOTAL PC
          </span>
          <span className="text-2xl font-black font-sans text-[#F2F3F5] mt-1 block">
            {isLoading ? "..." : totalPC}
          </span>
        </div>

        {/* AVAILABLE: Persona 3 Reload Blue Accent */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-p3r-blue"></span>
          <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-p3r-blue persona-slash rounded-[1px]"></span>
            AVAILABLE
          </span>
          <span className="text-2xl font-black font-sans text-[#F2F3F5] mt-1 block">
            {isLoading ? "..." : availableCount}
          </span>
        </div>

        {/* IN USE: Persona Red Accent */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-persona-red"></span>
          <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-persona-red persona-slash rounded-[1px]"></span>
            IN USE
          </span>
          <span className="text-2xl font-black font-sans text-[#F2F3F5] mt-1 block">
            {isLoading ? "..." : inUseCount}
          </span>
        </div>

        {/* MAINTENANCE: Warm Amber Accent */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-pamber"></span>
          <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-pamber persona-slash rounded-[1px]"></span>
            MAINTENANCE
          </span>
          <span className="text-2xl font-black font-sans text-[#F2F3F5] mt-1 block">
            {isLoading ? "..." : maintenanceCount}
          </span>
        </div>

        {/* OFFLINE: Muted Neutral Accent */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5 col-span-2 sm:col-span-1">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-surface-border"></span>
          <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-text-muted rounded-[1px]"></span>
            OFFLINE
          </span>
          <span className="text-2xl font-black font-sans text-text-muted mt-1 block">
            {isLoading ? "..." : offlineCount}
          </span>
        </div>
      </div>

      {/* Operations & Revenue Banner: Active Sessions & Today's Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ACTIVE SESSIONS */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5 flex items-center justify-between">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-persona-red"></span>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-persona-red animate-pulse" />
              ACTIVE SESSIONS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-sans text-[#F2F3F5]">
                {isLoading ? "..." : liveActiveSessions}
              </span>
              <span className="text-xs font-mono text-text-muted">
                ({inUseCount} PC stations in play)
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] font-mono text-text-secondary">Prisma Live State</span>
            <span className="text-[10px] font-mono text-persona-red font-semibold uppercase">Real-Time Sync</span>
          </div>
        </div>

        {/* TODAY'S REVENUE */}
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-[8px] p-3.5 flex items-center justify-between">
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-p3r-blue"></span>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-secondary tracking-wider block font-semibold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-p3r-blue" />
              TODAY&apos;S REVENUE
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#F2F3F5]">
                {isLoading ? "..." : formatRupiah(todayRevenue)}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] font-mono text-text-secondary">Cash Transactions</span>
            <span className="text-[10px] font-mono text-p3r-blue font-semibold uppercase">Verified Backend</span>
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {errorMessage && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[8px] text-xs text-persona-red flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection Error: {errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchData();
            }}
            className="px-2.5 py-1 bg-persona-red hover:bg-persona-red-hover text-white rounded-[4px] text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* PC STATIONS Control & Filters */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 select-none">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
            <span className="text-xs font-extrabold text-[#F2F3F5] uppercase tracking-wider font-sans">
              PC STATIONS
            </span>
          </div>
          <span className="text-text-muted font-mono text-[10px] uppercase mr-1">Zone:</span>
          {["ALL", "REGULAR", "VIP", "ARENA"].map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                selectedZone === zone
                  ? "bg-persona-red text-white"
                  : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted font-mono text-[10px] uppercase mr-1">Status:</span>
          {["ALL", "AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                selectedStatus === status
                  ? "bg-surface-muted text-white border border-surface-border"
                  : "text-text-secondary hover:text-[#F2F3F5]"
              }`}
            >
              {status === "IN_USE" ? "IN USE" : status}
            </button>
          ))}
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover rounded-[4px] ml-1 transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-persona-red" : ""
            }`}
            title="Refresh Stations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main PC Grid */}
      {isLoading ? (
        <div className="h-44 border border-surface-border rounded-[8px] bg-surface flex flex-col items-center justify-center gap-2 text-text-secondary text-xs font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-persona-red" />
          <span>Loading stations from database...</span>
        </div>
      ) : filteredPCs.length === 0 ? (
        <div className="h-32 border border-surface-border rounded-[8px] bg-surface flex items-center justify-center text-text-secondary text-xs font-mono">
          No stations found matching filters
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredPCs.map((pc) => (
            <PCStationCard
              key={pc.id}
              pc={pc}
              onStartSession={handleOpenStartSession}
              onViewDetail={handleOpenDetail}
              onEndSession={handleOpenEndSession}
              onAddTime={handleOpenAddTime}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <StartSessionModal
        isOpen={activeModal === "start"}
        onClose={() => {
          setActiveModal(null);
          setSelectedPC(null);
        }}
        station={selectedPC}
        members={members}
        onConfirm={handleConfirmStartSession}
      />

      <EndSessionPaymentModal
        isOpen={activeModal === "end"}
        onClose={() => {
          setActiveModal(null);
          setEndSessionData(null);
        }}
        sessionData={endSessionData}
        onConfirmCheckout={handleConfirmEndSession}
      />

      <AddSessionTimeModal
        isOpen={activeModal === "addTime"}
        onClose={() => {
          setActiveModal(null);
          setAddTimeSessionData(null);
        }}
        session={addTimeSessionData}
        onConfirmAddTime={handleConfirmAddTime}
      />

      <PCDetailModal
        isOpen={activeModal === "detail"}
        onClose={() => {
          setActiveModal(null);
          setSelectedPC(null);
        }}
        pc={selectedPC}
        onStatusChange={handleStatusChange}
        onEndSession={(pc) => {
          setActiveModal(null);
          handleOpenEndSession(pc);
        }}
        onStopSession={async (sessionId) => {
          await handleStopSession(sessionId);
          setActiveModal(null);
        }}
      />
    </div>
  );
}
