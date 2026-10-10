"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SessionItem } from "@/lib/types";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EndSessionPaymentModal } from "@/components/modals/EndSessionPaymentModal";
import { AddSessionTimeModal } from "@/components/modals/AddSessionTimeModal";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { Search, RefreshCw } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState<"end" | "addTime" | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    durationMinutes: number;
    totalAmount: number;
  } | null>(null);
  const [addTimeData, setAddTimeData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    remainingMinutes: number;
    hourlyRate: number;
  } | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    const station = s.pcStationNumber || s.consoleStationNumber || "";
    const user = s.memberName || s.guestName || "";
    const matchesSearch =
      station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenEnd = (s: SessionItem) => {
    setCheckoutData({
      id: s.id,
      stationNumber: s.pcStationNumber || s.consoleStationNumber || "Station",
      userName: s.memberName || s.guestName || "Guest",
      durationMinutes: s.durationMinutes,
      totalAmount: s.totalPrice,
    });
    setActiveModal("end");
  };

  const handleOpenAddTime = (s: SessionItem) => {
    setAddTimeData({
      id: s.id,
      stationNumber: s.pcStationNumber || s.consoleStationNumber || "Station",
      userName: s.memberName || s.guestName || "Guest",
      remainingMinutes: s.remainingMinutes,
      hourlyRate: s.hourlyRate,
    });
    setActiveModal("addTime");
  };

  const handleConfirmCheckout = async (payload: {
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
    await fetchSessions();
  };

  const handleConfirmAddTime = async (sessionId: string, additionalMinutes: number) => {
    const res = await fetch("/api/sessions/add-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, additionalMinutes }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchSessions();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Active Rental Sessions
          </h2>
        </div>
        <button
          onClick={() => fetchSessions()}
          className="p-1.5 rounded-[6px] text-text-secondary hover:text-[#F2F3F5] bg-surface border border-surface-border cursor-pointer transition-colors"
          title="Refresh Sessions"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search session, user, station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {["ALL", "ACTIVE", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-persona-red text-white"
                  : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session ID</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>User / Game</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {isLoading ? (
            <TableRow>
              <TableCell className="text-center py-8 text-text-secondary font-mono">
                Loading sessions...
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell className="text-center py-8 text-text-secondary font-mono">
                No active sessions
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-[11px] text-text-secondary font-semibold">
                  {s.sessionNumber}
                </TableCell>
                <TableCell className="font-extrabold text-[#F2F3F5] font-sans">
                  {s.pcStationNumber || s.consoleStationNumber}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-bold text-[#F2F3F5] block font-sans">
                    {s.memberName || s.guestName || "Guest"}
                  </span>
                  {s.currentGame && (
                    <span className="text-[11px] text-text-muted">{s.currentGame}</span>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-text-secondary font-mono">
                  {formatDateTime(s.startTime)}
                </TableCell>
                <TableCell className="font-mono text-text-secondary font-semibold">
                  {s.durationMinutes}m
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="font-mono font-bold text-[#F2F3F5]">
                  {formatRupiah(s.totalPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {s.status === "ACTIVE" ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenAddTime(s)}
                        className="px-2.5 py-1 text-xs bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] rounded-[4px] border border-surface-border font-sans font-medium cursor-pointer transition-colors"
                      >
                        +Time
                      </button>
                      <button
                        onClick={() => handleOpenEnd(s)}
                        className="px-2.5 py-1 text-xs bg-persona-red hover:bg-persona-red-hover text-white font-bold rounded-[4px] font-sans cursor-pointer transition-colors"
                      >
                        Checkout
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-text-muted">PAID (CASH)</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      <EndSessionPaymentModal
        isOpen={activeModal === "end"}
        onClose={() => {
          setActiveModal(null);
          setCheckoutData(null);
        }}
        sessionData={checkoutData}
        onConfirmCheckout={handleConfirmCheckout}
      />

      <AddSessionTimeModal
        isOpen={activeModal === "addTime"}
        onClose={() => {
          setActiveModal(null);
          setAddTimeData(null);
        }}
        session={addTimeData}
        onConfirmAddTime={handleConfirmAddTime}
      />
    </div>
  );
}
