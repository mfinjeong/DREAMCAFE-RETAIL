"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MaintenanceItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  CreateMaintenanceModal,
  CreateMaintenancePayload,
  MaintenanceStationOption,
} from "@/components/modals/CreateMaintenanceModal";
import { ResolveMaintenanceModal } from "@/components/modals/ResolveMaintenanceModal";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { Plus, Wrench, CheckCircle2 } from "lucide-react";

const STATUS_FILTERS = ["ALL", "SCHEDULED", "IN_PROGRESS", "RESOLVED"] as const;

interface StationApiItem {
  id: string;
  stationNumber: string;
  name: string;
  status: string;
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceItem[]>([]);
  const [stations, setStations] = useState<MaintenanceStationOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveTicket, setResolveTicket] = useState<MaintenanceItem | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, pcRes, conRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/pc"),
        fetch("/api/consoles"),
      ]);
      const [tJson, pcJson, conJson] = await Promise.all([tRes.json(), pcRes.json(), conRes.json()]);

      if (tJson.success) {
        setTickets(tJson.data);
        setPageError(null);
      } else {
        setPageError(tJson.message || "Gagal memuat tiket servis");
      }

      const toOptions = (list: StationApiItem[] | undefined, type: "PC" | "CONSOLE") =>
        (list || []).map((s) => ({
          type,
          id: s.id,
          stationNumber: s.stationNumber,
          name: s.name,
          status: s.status,
        }));
      setStations([
        ...(pcJson.success ? toOptions(pcJson.data, "PC") : []),
        ...(conJson.success ? toOptions(conJson.data, "CONSOLE") : []),
      ]);
    } catch (e) {
      console.error(e);
      setPageError("Gagal terhubung ke server. Periksa koneksi database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreate = async (payload: CreateMaintenancePayload): Promise<string | null> => {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) return json.message || "Gagal membuat tiket servis";
    await fetchAll();
    return null;
  };

  const patchTicket = async (
    id: string,
    payload: { status?: "IN_PROGRESS" | "RESOLVED"; cost?: number; notes?: string }
  ): Promise<string | null> => {
    const res = await fetch(`/api/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) return json.message || "Gagal memperbarui tiket";
    await fetchAll();
    return null;
  };

  const handleStart = async (id: string) => {
    const error = await patchTicket(id, { status: "IN_PROGRESS" });
    setPageError(error);
  };

  const handleResolve = (id: string, payload: { cost: number; notes?: string }) =>
    patchTicket(id, { status: "RESOLVED", ...payload });

  const visible = tickets.filter((t) => statusFilter === "ALL" || t.status === statusFilter);
  const openCount = tickets.filter((t) => t.status !== "RESOLVED").length;
  const resolvedCost = tickets
    .filter((t) => t.status === "RESOLVED")
    .reduce((acc, t) => acc + t.cost, 0);

  // Station yang sedang dipakai tidak bisa dilaporkan; selesaikan sesinya dulu.
  const reportableStations = stations.filter((s) => s.status !== "IN_USE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Hardware Maintenance
          </h2>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Lapor Kerusakan
        </Button>
      </div>

      {pageError && (
        <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
          {pageError}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 bg-surface border border-surface-border rounded-[8px]">
          <span className="text-[10px] font-mono uppercase text-text-secondary font-semibold block tracking-wider">
            Tiket Aktif
          </span>
          <span className="text-xl font-bold font-mono text-[#F2F3F5] mt-1 block">{openCount}</span>
        </div>
        <div className="p-3 bg-surface border border-surface-border rounded-[8px]">
          <span className="text-[10px] font-mono uppercase text-text-secondary font-semibold block tracking-wider">
            Total Tiket
          </span>
          <span className="text-xl font-bold font-mono text-[#F2F3F5] mt-1 block">{tickets.length}</span>
        </div>
        <div className="p-3 bg-surface border border-surface-border rounded-[8px]">
          <span className="text-[10px] font-mono uppercase text-text-secondary font-semibold block tracking-wider">
            Biaya Perbaikan (Selesai)
          </span>
          <span className="text-xl font-bold font-mono text-[#F2F3F5] mt-1 block">
            {formatRupiah(resolvedCost)}
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex items-center gap-1.5 font-sans text-xs">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === s
                ? "bg-persona-red text-white"
                : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Station</TableHead>
            <TableHead>Keluhan</TableHead>
            <TableHead>Teknisi</TableHead>
            <TableHead>Biaya</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dilaporkan</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-xs text-text-muted py-6">
                Memuat data...
              </TableCell>
            </TableRow>
          ) : visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-xs text-text-muted py-6">
                Tidak ada tiket servis.
              </TableCell>
            </TableRow>
          ) : (
            visible.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">
                  <span className="font-bold text-[#F2F3F5] block font-mono">{t.stationNumber}</span>
                  <span className="text-[11px] text-text-secondary">{t.type}</span>
                </TableCell>
                <TableCell className="text-xs max-w-xs">
                  <span className="font-semibold text-[#F2F3F5] block">{t.title}</span>
                  <span className="text-[11px] text-text-secondary whitespace-pre-line line-clamp-2">
                    {t.description}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-text-secondary">{t.technician}</TableCell>
                <TableCell className="font-mono text-xs text-[#F2F3F5]">{formatRupiah(t.cost)}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-text-secondary">
                  {formatDateTime(t.reportedAt)}
                </TableCell>
                <TableCell className="text-right">
                  {t.status === "RESOLVED" ? (
                    <span className="text-[11px] text-text-muted font-mono">
                      {t.resolvedAt ? formatDateTime(t.resolvedAt) : "-"}
                    </span>
                  ) : (
                    <div className="flex justify-end gap-1.5">
                      {t.status === "SCHEDULED" && (
                        <Button variant="outline" size="sm" onClick={() => handleStart(t.id)}>
                          <Wrench className="w-3.5 h-3.5 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button variant="p3r" size="sm" onClick={() => setResolveTicket(t)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      <CreateMaintenanceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        stations={reportableStations}
        onSubmit={handleCreate}
      />

      <ResolveMaintenanceModal
        isOpen={resolveTicket !== null}
        onClose={() => setResolveTicket(null)}
        ticket={resolveTicket}
        onSubmit={handleResolve}
      />
    </div>
  );
}
