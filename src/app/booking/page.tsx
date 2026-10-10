"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BookingItem, PCStation, ConsoleStation, MemberItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/formatters";
import { Plus, Search, Play, Check, XCircle, AlertCircle, Calendar, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";

export default function BookingPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [pcs, setPcs] = useState<PCStation[]>([]);
  const [consoles, setConsoles] = useState<ConsoleStation[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [availableStations, setAvailableStations] = useState<{
    pcs: { id: string; stationNumber: string; name: string; zone: string; hourlyRate: number }[];
    consoles: { id: string; stationNumber: string; name: string; consoleType: string; hourlyRate: number }[];
  }>({ pcs: [], consoles: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    memberId: "",
    type: "PC" as "PC" | "CONSOLE",
    stationId: "",
    bookingDate: new Date().toISOString().slice(0, 10),
    startTime: "14:00",
    durationHours: 2,
    status: "CONFIRMED" as "CONFIRMED" | "PENDING",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (typeFilter !== "ALL") queryParams.set("type", typeFilter);
      if (dateFilter) queryParams.set("date", dateFilter);

      const [bookRes, pcRes, conRes, memRes] = await Promise.all([
        fetch(`/api/bookings?${queryParams.toString()}`),
        fetch("/api/pc"),
        fetch("/api/consoles"),
        fetch("/api/members"),
      ]);

      const [bookJson, pcJson, conJson, memJson] = await Promise.all([
        bookRes.json(),
        pcRes.json(),
        conRes.json(),
        memRes.json(),
      ]);

      if (bookJson.success) setBookings(bookJson.data);
      if (pcJson.success) setPcs(pcJson.data);
      if (conJson.success) setConsoles(conJson.data);
      if (memJson.success) {
        setMembers(memJson.data);
        if (!formData.memberId && memJson.data.length > 0) {
          setFormData((prev) => ({ ...prev, memberId: memJson.data[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
      setNotificationMsg({ type: "error", text: "Gagal memuat data reservasi dari server" });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, dateFilter, formData.memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch real-time available stations for modal based on date, time & duration
  const fetchAvailability = useCallback(async () => {
    if (!formData.bookingDate || !formData.startTime || !formData.durationHours) return;
    try {
      const res = await fetch(
        `/api/bookings/availability?date=${formData.bookingDate}&startTime=${formData.startTime}&durationHours=${formData.durationHours}&type=${formData.type}`
      );
      const json = await res.json();
      if (json.success) {
        setAvailableStations(json.data);
        // Auto-select first available station if current selected is not available
        const currentList = formData.type === "PC" ? json.data.pcs : json.data.consoles;
        if (currentList.length > 0) {
          const currentValid = currentList.some((s: { id: string }) => s.id === formData.stationId);
          if (!currentValid) {
            setFormData((prev) => ({ ...prev, stationId: currentList[0].id }));
          }
        } else {
          setFormData((prev) => ({ ...prev, stationId: "" }));
        }
      }
    } catch (e) {
      console.error("Failed to check station availability", e);
    }
  }, [formData.bookingDate, formData.startTime, formData.durationHours, formData.type, formData.stationId]);

  useEffect(() => {
    if (createModalOpen) {
      fetchAvailability();
    }
  }, [createModalOpen, fetchAvailability]);

  // Calculate estimated total price in modal
  const estimatedBill = useMemo(() => {
    let rate = 10000;
    if (formData.type === "PC") {
      const pc = pcs.find((p) => p.id === formData.stationId);
      if (pc) rate = pc.hourlyRate;
    } else {
      const con = consoles.find((c) => c.id === formData.stationId);
      if (con) rate = con.hourlyRate;
    }
    return Math.round(formData.durationHours * rate);
  }, [formData.type, formData.stationId, formData.durationHours, pcs, consoles]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.stationId) {
      setErrorMsg("Pilih station yang tersedia terlebih dahulu");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.message);
        return;
      }

      setCreateModalOpen(false);
      setNotificationMsg({ type: "success", text: json.message || "Reservasi berhasil dibuat!" });
      await fetchData();
    } catch {
      setErrorMsg("Failed to create reservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = async (id: string) => {
    try {
      setActionInProgressId(id);
      const res = await fetch(`/api/bookings/${id}/confirm`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setNotificationMsg({ type: "error", text: json.message });
      } else {
        setNotificationMsg({ type: "success", text: json.message });
        await fetchData();
      }
    } catch {
      setNotificationMsg({ type: "error", text: "Gagal mengonfirmasi reservasi" });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStartSession = async (id: string) => {
    try {
      setActionInProgressId(id);
      const res = await fetch(`/api/bookings/${id}/start`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setNotificationMsg({ type: "error", text: json.message });
      } else {
        setNotificationMsg({ type: "success", text: json.message });
        await fetchData();
      }
    } catch {
      setNotificationMsg({ type: "error", text: "Gagal memulai sesi dari reservasi" });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    try {
      setActionInProgressId(selectedBookingForCancel.id);
      const res = await fetch(`/api/bookings/${selectedBookingForCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Dibatalkan oleh operator" }),
      });
      const json = await res.json();
      if (!json.success) {
        setNotificationMsg({ type: "error", text: json.message });
      } else {
        setNotificationMsg({ type: "success", text: json.message });
        setCancelModalOpen(false);
        setSelectedBookingForCancel(null);
        setCancelReason("");
        await fetchData();
      }
    } catch {
      setNotificationMsg({ type: "error", text: "Gagal membatalkan reservasi" });
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const station = b.stationNumber || b.pcStationNumber || b.consoleStationNumber || "";
    return (
      station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.username && b.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Station Reservations
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notificationMsg && (
        <div
          className={`p-3 rounded-[6px] border text-xs flex items-center justify-between ${
            notificationMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
              : "bg-persona-red-subtle border-persona-red-border text-persona-red"
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="text-text-muted hover:text-[#F2F3F5] ml-4 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-surface border border-surface-border rounded-[8px] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-60">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, station, member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red"
          >
            <option value="ALL">All Station Types</option>
            <option value="PC">PC Stations</option>
            <option value="CONSOLE">Console Lounge</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded-[6px] px-2 py-0.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-[#F2F3F5] focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-[10px] text-text-muted hover:text-persona-red"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="text-xs font-mono text-text-secondary">
          Showing {filteredBookings.length} of {bookings.length} Bookings
        </div>
      </div>

      {/* Bookings Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time Slot</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Estimated Bill</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-text-muted">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-persona-red" />
                  <span>Loading reservations from database...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-text-muted">
                Tidak ada data reservasi yang ditemukan.
              </TableCell>
            </TableRow>
          ) : (
            filteredBookings.map((b) => {
              const stationLabel = b.stationNumber || b.pcStationNumber || b.consoleStationNumber || "-";
              const isBusy = actionInProgressId === b.id;

              return (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs font-bold text-persona-red">
                    {b.bookingCode}
                  </TableCell>
                  <TableCell className="font-extrabold text-[#F2F3F5] font-sans">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary border border-surface-border">
                        {b.type}
                      </span>
                      <span>{stationLabel}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-[#F2F3F5] font-semibold">
                    <div>{b.memberName}</div>
                    {b.username && (
                      <div className="text-[10px] font-mono text-text-muted">@{b.username}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary font-mono">
                    {b.bookingDate}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium text-[#F2F3F5]">
                    {b.startTime} - {b.endTime}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary font-mono">
                    {b.durationHours}h
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-[#F2F3F5]">
                    {formatRupiah(b.totalPrice)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Confirm Action for PENDING bookings */}
                      {b.status === "PENDING" && (
                        <button
                          onClick={() => handleConfirmBooking(b.id)}
                          disabled={isBusy}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-900/80 flex items-center gap-1 disabled:opacity-50"
                          title="Confirm Reservation"
                        >
                          <Check className="w-3 h-3" />
                          Confirm
                        </button>
                      )}

                      {/* Start Session Action for CONFIRMED or PENDING bookings */}
                      {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                        <button
                          onClick={() => handleStartSession(b.id)}
                          disabled={isBusy}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-persona-red text-white hover:bg-persona-red-hover flex items-center gap-1 disabled:opacity-50"
                          title="Start Session on Station"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}

                      {/* Cancel Action for active bookings */}
                      {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                        <button
                          onClick={() => {
                            setSelectedBookingForCancel(b);
                            setCancelReason("");
                            setCancelModalOpen(true);
                          }}
                          disabled={isBusy}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-surface-muted text-text-muted hover:text-persona-red hover:bg-persona-red-subtle border border-surface-border flex items-center gap-1 disabled:opacity-50"
                          title="Cancel Reservation"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      )}

                      {b.status === "COMPLETED" && (
                        <span className="text-[11px] font-mono text-text-muted">Completed</span>
                      )}

                      {b.status === "CANCELLED" && (
                        <span className="text-[11px] font-mono text-text-muted">Cancelled</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </Table>

      {/* Booking Form Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="New Reservation"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Select
            label="Member Account"
            value={formData.memberId}
            onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
            options={members.map((m) => ({
              label: `${m.fullName} (@${m.username}) - [${m.tier}]`,
              value: m.id,
            }))}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => {
                const nextType = e.target.value as "PC" | "CONSOLE";
                setFormData({ ...formData, type: nextType });
              }}
              options={[
                { label: "PC Station", value: "PC" },
                { label: "Console Lounge", value: "CONSOLE" },
              ]}
            />

            <Select
              label={`Station (${formData.type === "PC" ? availableStations.pcs.length : availableStations.consoles.length} Available)`}
              value={formData.stationId}
              onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
              options={
                formData.type === "PC"
                  ? availableStations.pcs.map((p) => ({
                      label: `${p.stationNumber} (${p.zone}) - ${formatRupiah(p.hourlyRate)}/h`,
                      value: p.id,
                    }))
                  : availableStations.consoles.map((c) => ({
                      label: `${c.stationNumber} (${c.consoleType}) - ${formatRupiah(c.hourlyRate)}/h`,
                      value: c.id,
                    }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Input
              label="Date"
              type="date"
              value={formData.bookingDate}
              onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
              required
            />
            <Input
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
            <Input
              label="Duration (Hours)"
              type="number"
              min="1"
              max="12"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Initial Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "CONFIRMED" | "PENDING" })}
              options={[
                { label: "CONFIRMED (Direct)", value: "CONFIRMED" },
                { label: "PENDING (Awaiting Check-in)", value: "PENDING" },
              ]}
            />

            <div className="flex flex-col justify-end">
              <div className="bg-surface-muted border border-surface-border rounded-[6px] px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] text-text-muted uppercase font-mono">Estimated Bill:</span>
                <span className="text-sm font-bold font-mono text-[#F2F3F5]">{formatRupiah(estimatedBill)}</span>
              </div>
            </div>
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Birthday party, preferred mousepad"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={!formData.stationId}
            >
              Save Reservation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedBookingForCancel(null);
        }}
        title="Cancel Reservation"
        maxWidth="sm"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-text-secondary">
            Are you sure you want to cancel reservation{" "}
            <span className="font-mono font-bold text-persona-red">
              {selectedBookingForCancel?.bookingCode}
            </span>{" "}
            for{" "}
            <span className="font-bold text-[#F2F3F5]">
              {selectedBookingForCancel?.memberName}
            </span>
            ?
          </p>

          <Input
            label="Reason for cancellation (optional)"
            placeholder="e.g. Member requested cancellation / No show"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedBookingForCancel(null);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleCancelBooking}
              isLoading={actionInProgressId === selectedBookingForCancel?.id}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
