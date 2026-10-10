"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PCStation, StationZone, PCStatus, MemberItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PCDetailModal } from "@/components/modals/PCDetailModal";
import { StartSessionModal } from "@/components/modals/StartSessionModal";
import { EndSessionPaymentModal } from "@/components/modals/EndSessionPaymentModal";
import { formatRupiah } from "@/lib/formatters";
import { Plus, Search, Edit2, Trash2, Eye, Play, Square, DollarSign, RefreshCw, AlertTriangle } from "lucide-react";

export default function PCManagementPage() {
  const [pcs, setPcs] = useState<PCStation[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [selectedPC, setSelectedPC] = useState<PCStation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [startSessionModalOpen, setStartSessionModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [endSessionData, setEndSessionData] = useState<{
    id: string;
    stationNumber: string;
    userName: string;
    durationMinutes: number;
    totalAmount: number;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: "",
    stationNumber: "",
    name: "",
    zone: "REGULAR" as StationZone,
    status: "AVAILABLE" as PCStatus,
    hourlyRate: 10000,
    specsCpu: "Intel Core i5-13400F",
    specsGpu: "NVIDIA GeForce RTX 4060 8GB",
    specsRam: "16GB DDR5 5200MHz",
    specsMonitor: "24\" 165Hz IPS",
    specsStorage: "1TB NVMe SSD",
    specsPeripherals: "Mechanical Keyboard + Mouse",
    ipAddress: "192.168.1.100",
    macAddress: "70:85:C2:55:01:00",
  });

  // Fetch PCs with backend filtering & search parameters
  const fetchPCs = useCallback(async (query: string, zone: string, status: string) => {
    try {
      setErrorMsg(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (zone !== "ALL") params.set("zone", zone);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/pc?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load PC stations from database");
      }
      setPcs(json.data);
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Database fetch failed");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch registered members for starting sessions
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

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Debounced search and filter execution via backend service
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPCs(searchQuery, zoneFilter, statusFilter);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, zoneFilter, statusFilter, fetchPCs]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchPCs(searchQuery, zoneFilter, statusFilter);
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActionError(null);
    setFormData({
      id: "",
      stationNumber: `PC ${(pcs.length + 1).toString().padStart(2, "0")}`,
      name: `Station ${(pcs.length + 1).toString().padStart(2, "0")}`,
      zone: "REGULAR",
      status: "AVAILABLE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F",
      specsGpu: "NVIDIA GeForce RTX 4060 8GB",
      specsRam: "16GB DDR5 5200MHz",
      specsMonitor: "24\" 165Hz IPS",
      specsStorage: "1TB NVMe SSD",
      specsPeripherals: "Mechanical Keyboard + Mouse",
      ipAddress: `192.168.1.${110 + pcs.length}`,
      macAddress: `70:85:C2:55:01:${(10 + pcs.length).toString(16)}`,
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (pc: PCStation) => {
    setIsEditing(true);
    setActionError(null);
    setFormData({
      id: pc.id,
      stationNumber: pc.stationNumber,
      name: pc.name,
      zone: pc.zone,
      status: pc.status,
      hourlyRate: pc.hourlyRate,
      specsCpu: pc.specsCpu,
      specsGpu: pc.specsGpu,
      specsRam: pc.specsRam,
      specsMonitor: pc.specsMonitor,
      specsStorage: pc.specsStorage,
      specsPeripherals: pc.specsPeripherals,
      ipAddress: pc.ipAddress || "",
      macAddress: pc.macAddress || "",
    });
    setEditModalOpen(true);
  };

  const handleSavePC = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const payload = {
      stationNumber: formData.stationNumber,
      name: formData.name,
      zone: formData.zone,
      status: formData.status,
      hourlyRate: Number(formData.hourlyRate),
      specsCpu: formData.specsCpu,
      specsGpu: formData.specsGpu,
      specsRam: formData.specsRam,
      specsMonitor: formData.specsMonitor,
      specsStorage: formData.specsStorage,
      specsPeripherals: formData.specsPeripherals,
      ipAddress: formData.ipAddress,
      macAddress: formData.macAddress,
    };

    try {
      const url = isEditing ? `/api/pc/${formData.id}` : "/api/pc";
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

      setEditModalOpen(false);
      await fetchPCs(searchQuery, zoneFilter, statusFilter);
    } catch {
      setActionError("Failed to save PC station.");
    }
  };

  const handleDeletePC = async (id: string, stationNumber: string) => {
    if (!confirm(`Delete station ${stationNumber}?`)) return;

    try {
      const res = await fetch(`/api/pc/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        alert(json.message);
        return;
      }
      await fetchPCs(searchQuery, zoneFilter, statusFilter);
    } catch {
      alert("Failed to delete PC.");
    }
  };

  const handleStatusChange = async (pcId: string, newStatus: PCStatus) => {
    const res = await fetch(`/api/pc/${pcId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchPCs(searchQuery, zoneFilter, statusFilter);
    setDetailModalOpen(false);
  };

  // Session interaction handlers
  const handleOpenStartSession = (pc: PCStation) => {
    setSelectedPC(pc);
    setStartSessionModalOpen(true);
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
    await fetchPCs(searchQuery, zoneFilter, statusFilter);
  };

  const handleOpenCheckout = (pc: PCStation) => {
    if (!pc.activeSession) return;
    setEndSessionData({
      id: pc.activeSession.id,
      stationNumber: pc.stationNumber,
      userName: pc.activeSession.memberName || pc.activeSession.guestName || "Guest",
      durationMinutes: pc.activeSession.durationMinutes,
      totalAmount: pc.activeSession.totalPrice,
    });
    setCheckoutModalOpen(true);
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
    await fetchPCs(searchQuery, zoneFilter, statusFilter);
  };

  const handleStopSession = async (sessionId: string) => {
    const res = await fetch("/api/sessions/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    await fetchPCs(searchQuery, zoneFilter, statusFilter);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            PC Station Fleet
          </h2>
          <span className="text-[11px] font-mono text-text-secondary">
            ({pcs.length} stations loaded from database)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-persona-red" : ""
            }`}
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Station
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[8px] text-xs text-persona-red flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection Error: {errorMsg}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchPCs(searchQuery, zoneFilter, statusFilter);
            }}
            className="px-2.5 py-1 bg-persona-red hover:bg-persona-red-hover text-white rounded-[4px] text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Row: Backend Service Filtering */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search station or specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Zones</option>
            <option value="REGULAR">REGULAR</option>
            <option value="VIP">VIP</option>
            <option value="ARENA">ARENA</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Station</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Rate / Hr</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Specifications</TableHead>
            <TableHead>Active Session</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-text-secondary text-xs font-mono">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-persona-red" />
                  <span>Loading PC stations from database...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : pcs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-text-secondary text-xs font-mono">
                No stations found matching database filters
              </TableCell>
            </TableRow>
          ) : (
            pcs.map((pc) => (
              <TableRow key={pc.id}>
                <TableCell className="font-extrabold text-[#F2F3F5] font-sans">
                  {pc.stationNumber}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-text-secondary">
                  {pc.zone}
                </TableCell>
                <TableCell className="font-mono text-[#F2F3F5] font-semibold">
                  {formatRupiah(pc.hourlyRate)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={pc.status} />
                </TableCell>
                <TableCell className="text-[11px] text-text-secondary font-mono">
                  {pc.specsGpu} • {pc.specsCpu}
                </TableCell>
                <TableCell className="text-xs">
                  {pc.status === "IN_USE" && pc.activeSession ? (
                    <div className="space-y-0.5 font-mono">
                      <span className="text-persona-red font-bold block">
                        {pc.activeSession.memberName || pc.activeSession.guestName || "Guest"}
                      </span>
                      <span className="text-text-secondary text-[10px] block">
                        {pc.currentGame || pc.activeSession.currentGame || "Session"} • {pc.activeSession.remainingMinutes}m left
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-muted font-mono">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Session Quick Controls */}
                    {pc.status === "AVAILABLE" && (
                      <button
                        onClick={() => handleOpenStartSession(pc)}
                        className="p-1.5 text-white bg-persona-red hover:bg-persona-red-hover active:bg-persona-red-active rounded-[4px] cursor-pointer transition-colors"
                        title="Start Session"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    {pc.status === "IN_USE" && pc.activeSession && (
                      <>
                        <button
                          onClick={() => handleOpenCheckout(pc)}
                          className="p-1.5 text-p3r-blue hover:text-white bg-p3r-blue-subtle hover:bg-p3r-blue border border-p3r-blue-border rounded-[4px] cursor-pointer transition-colors"
                          title="Checkout & Pay Cash"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Stop active session on ${pc.stationNumber}?`)) return;
                            try {
                              await handleStopSession(pc.activeSession!.id);
                            } catch (err: unknown) {
                              alert(err instanceof Error ? err.message : "Failed to stop session");
                            }
                          }}
                          className="p-1.5 text-persona-red hover:text-white bg-persona-red-subtle hover:bg-persona-red border border-persona-red-border rounded-[4px] cursor-pointer transition-colors"
                          title="Stop Session"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </>
                    )}

                    {/* Standard Station Controls */}
                    <button
                      onClick={() => {
                        setSelectedPC(pc);
                        setDetailModalOpen(true);
                      }}
                      className="p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border cursor-pointer transition-colors"
                      title="Detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(pc)}
                      className="p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border cursor-pointer transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePC(pc.id, pc.stationNumber)}
                      className="p-1.5 text-persona-red hover:text-white bg-persona-red-subtle hover:bg-persona-red rounded-[4px] border border-persona-red-border cursor-pointer transition-colors disabled:opacity-30"
                      title="Delete"
                      disabled={pc.status === "IN_USE"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      {/* Edit / Create Station Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isEditing ? `Edit ${formData.stationNumber}` : "New PC Station"}
        maxWidth="md"
      >
        <form onSubmit={handleSavePC} className="space-y-3.5">
          {actionError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Station Number"
              placeholder="e.g. PC 11"
              value={formData.stationNumber}
              onChange={(e) => setFormData({ ...formData, stationNumber: e.target.value })}
              required
            />
            <Input
              label="Station Name"
              placeholder="e.g. Station 11"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Select
              label="Zone"
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value as StationZone })}
              options={[
                { label: "REGULAR", value: "REGULAR" },
                { label: "VIP", value: "VIP" },
                { label: "ARENA", value: "ARENA" },
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
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PCStatus })}
              options={[
                { label: "AVAILABLE", value: "AVAILABLE" },
                { label: "MAINTENANCE", value: "MAINTENANCE" },
                { label: "OFFLINE", value: "OFFLINE" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="CPU"
              value={formData.specsCpu}
              onChange={(e) => setFormData({ ...formData, specsCpu: e.target.value })}
              required
            />
            <Input
              label="GPU"
              value={formData.specsGpu}
              onChange={(e) => setFormData({ ...formData, specsGpu: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="RAM"
              value={formData.specsRam}
              onChange={(e) => setFormData({ ...formData, specsRam: e.target.value })}
              required
            />
            <Input
              label="Monitor"
              value={formData.specsMonitor}
              onChange={(e) => setFormData({ ...formData, specsMonitor: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <PCDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPC(null);
        }}
        pc={selectedPC}
        onStatusChange={handleStatusChange}
        onEndSession={(pc) => {
          setDetailModalOpen(false);
          handleOpenCheckout(pc);
        }}
        onStopSession={async (sessionId) => {
          await handleStopSession(sessionId);
          setDetailModalOpen(false);
        }}
      />

      {/* Start Session Modal */}
      <StartSessionModal
        isOpen={startSessionModalOpen}
        onClose={() => {
          setStartSessionModalOpen(false);
          setSelectedPC(null);
        }}
        station={selectedPC}
        members={members}
        onConfirm={handleConfirmStartSession}
      />

      {/* End Session Cash Checkout Modal */}
      <EndSessionPaymentModal
        isOpen={checkoutModalOpen}
        onClose={() => {
          setCheckoutModalOpen(false);
          setEndSessionData(null);
        }}
        sessionData={endSessionData}
        onConfirmCheckout={handleConfirmCheckout}
      />
    </div>
  );
}
