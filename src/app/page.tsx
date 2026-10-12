"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { PCStation, MemberItem, PCStatus } from "@/lib/types";
import { PCStationCard } from "@/components/cards/PCStationCard";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/formatters";
import Link from "next/link";
import { RefreshCw, AlertTriangle, DollarSign, Monitor, Gamepad2, ShoppingBag, Calendar, BarChart3, Activity as ActivityIcon } from "lucide-react";

const StartSessionModal = dynamic(() => import("@/components/modals/StartSessionModal").then(m => ({ default: m.StartSessionModal })), { ssr: false });
const EndSessionPaymentModal = dynamic(() => import("@/components/modals/EndSessionPaymentModal").then(m => ({ default: m.EndSessionPaymentModal })), { ssr: false });
const AddSessionTimeModal = dynamic(() => import("@/components/modals/AddSessionTimeModal").then(m => ({ default: m.AddSessionTimeModal })), { ssr: false });
const PCDetailModal = dynamic(() => import("@/components/modals/PCDetailModal").then(m => ({ default: m.PCDetailModal })), { ssr: false });

export default function DashboardPage() {
  const [pcs, setPcs] = useState<PCStation[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0);
  const [statsLoaded, setStatsLoaded] = useState(false);
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

  const [nowSeconds, setNowSeconds] = useState<number>(() => Math.floor(Date.now() / 1000));
  const hasActiveStation = pcs.some((pc) => pc.status === "IN_USE" && pc.activeSession);

  useEffect(() => {
    if (!hasActiveStation) return;
    setNowSeconds(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [hasActiveStation]);

  const fetchData = useCallback(async () => {
    try {
      setErrorMessage(null);
      setStatsLoaded(false);
      const [pcRes, statsRes] = await Promise.all([
        fetch("/api/pc"),
        fetch("/api/dashboard/stats"),
      ]);

      const [pcJson, statsJson] = await Promise.all([
        pcRes.json(),
        statsRes.json(),
      ]);

      if (!pcRes.ok || !pcJson.success) {
        throw new Error(pcJson.message || "Failed to load PC stations from database");
      }
      setPcs(pcJson.data);

      if (statsJson.success && statsJson.data) {
        setTodayRevenue(statsJson.data.todayRevenue || 0);
        setActiveSessionsCount(statsJson.data.activeSessionsCount || 0);
        setStatsLoaded(true);
      } else {
        setStatsLoaded(false);
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

  const filteredPCs = pcs.filter((p) => {
    if (selectedZone !== "ALL" && p.zone !== selectedZone) return false;
    if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false;
    return true;
  });

  const handleOpenStartSession = (pc: PCStation) => {
    setSelectedPC(pc);
    setActiveModal("start");
    if (members.length === 0) {
      fetch("/api/members")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) setMembers(json.data);
        })
        .catch((err) => console.error("Failed to load members", err));
    }
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1 font-medium">Ringkasan operasional & quick actions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Quick Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Link href="/pc" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <Monitor className="w-8 h-8 text-orange group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">PC Stations</span>
        </Link>
        <Link href="/consoles" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <Gamepad2 className="w-8 h-8 text-orange group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Console</span>
        </Link>
        <Link href="/games" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <Gamepad2 className="w-8 h-8 text-p3r-blue group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Games</span>
        </Link>
        <Link href="/store" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <ShoppingBag className="w-8 h-8 text-teal group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Store & POS</span>
        </Link>
        <Link href="/sessions" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <ActivityIcon className="w-8 h-8 text-sage group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Sessions</span>
        </Link>
        <Link href="/booking" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <Calendar className="w-8 h-8 text-pamber group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Booking</span>
        </Link>
        <Link href="/members" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <Monitor className="w-8 h-8 text-persona-red group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Members</span>
        </Link>
        <Link href="/reports" className="group bg-white hover:bg-surface-muted border border-surface-border hover:border-orange rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md">
          <BarChart3 className="w-8 h-8 text-terracotta group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-text-primary">Reports</span>
        </Link>
      </div>

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PC Fleet Status */}
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-sm">
          <h2 className="text-xs font-semibold text-text-primary uppercase mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-text-secondary" />
            PC Fleet
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-dark rounded-lg p-2.5 text-center">
              <div className="text-2xl font-semibold text-text-primary">{totalPC}</div>
              <div className="text-xs font-medium text-text-muted uppercase mt-0.5">Total</div>
            </div>
            <div className="bg-sage-subtle border border-sage-border rounded-lg p-2.5 text-center">
              <div className="text-2xl font-semibold text-sage">{availableCount}</div>
              <div className="text-xs font-medium text-sage uppercase mt-0.5">Avail</div>
            </div>
            <div className="bg-coffee-subtle border border-coffee-border rounded-lg p-2.5 text-center">
              <div className="text-2xl font-semibold text-coffee">{inUseCount}</div>
              <div className="text-xs font-medium text-coffee uppercase mt-0.5">In Use</div>
            </div>
            <div className="bg-pamber-subtle border border-pamber-border rounded-lg p-2.5 text-center">
              <div className="text-2xl font-semibold text-pamber">{maintenanceCount}</div>
              <div className="text-xs font-medium text-pamber uppercase mt-0.5">Maint</div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-sm">
          <h2 className="text-xs font-semibold text-text-primary uppercase mb-3 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-text-secondary" />
            Active Sessions
          </h2>
          <div className="text-4xl font-bold text-text-primary tracking-tight">
            {isLoading ? "..." : statsLoaded ? activeSessionsCount : "—"}
          </div>
          <div className="text-xs text-text-secondary mt-2">
            Sessions currently recorded
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-sm md:col-span-2">
          <h2 className="text-xs font-semibold text-text-primary uppercase mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-text-secondary" />
            Today's Revenue
          </h2>
          <div className="text-4xl font-bold text-text-primary tracking-tight">
            {isLoading ? "..." : statsLoaded ? formatRupiah(todayRevenue) : "—"}
          </div>
          <div className="text-xs text-text-secondary mt-2">
            Cash transactions
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {errorMessage && (
        <div className="p-3 bg-coffee-subtle border border-coffee-border rounded-[8px] text-xs text-coffee flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection Error: {errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchData();
            }}
            className="px-2.5 py-1 bg-coffee hover:bg-coffee-hover text-white rounded-[4px] text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* PC STATIONS Control & Filters */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 select-none">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-3.5 bg-coffee rounded-[1px]"></span>
            <span className="text-xs font-semibold text-text-primary font-sans">
              PC STATIONS
            </span>
          </div>
          <span className="text-text-muted font-mono text-xs uppercase mr-1">Zone:</span>
          {["ALL", "REGULAR", "VIP", "ARENA"].map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                selectedZone === zone
                  ? "bg-coffee text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted font-mono text-xs uppercase mr-1">Status:</span>
          {["ALL", "AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                selectedStatus === status
                  ? "bg-surface-muted text-white border border-surface-border"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {status === "IN_USE" ? "IN USE" : status}
            </button>
          ))}
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-[4px] ml-1 transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-coffee" : ""
            }`}
            title="Refresh Stations"
            aria-label="Refresh Stations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main PC Grid */}
      {isLoading ? (
        <div className="h-44 border border-surface-border rounded-[8px] bg-surface flex flex-col items-center justify-center gap-2 text-text-secondary text-xs font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-coffee" />
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
              nowSeconds={nowSeconds}
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
