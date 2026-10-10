"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PCStation, PCStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/formatters";

interface PCDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pc: PCStation | null;
  onStatusChange: (pcId: string, newStatus: PCStatus) => Promise<void>;
  onEndSession?: (pc: PCStation) => void;
  onStopSession?: (sessionId: string) => Promise<void>;
}

export const PCDetailModal: React.FC<PCDetailModalProps> = ({
  isOpen,
  onClose,
  pc,
  onStatusChange,
  onEndSession,
  onStopSession,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<PCStatus | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!pc) return null;

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === pc.status) return;
    setErrorMsg(null);
    try {
      setIsUpdating(true);
      await onStatusChange(pc.id, selectedStatus as PCStatus);
      setSelectedStatus("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to update status.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${pc.stationNumber} • ${pc.name}`}
      subtitle={`Zone: ${pc.zone}`}
      maxWidth="md"
    >
      <div className="space-y-3.5">
        {errorMsg && (
          <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
            {errorMsg}
          </div>
        )}

        {/* Primary Operational Section */}
        <div className="p-3.5 bg-surface-muted border border-surface-border rounded-[8px] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider font-sans">
              Current Session
            </span>
            <StatusBadge status={pc.status} />
          </div>

          {pc.status === "IN_USE" && pc.activeSession ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[11px] text-text-muted block">Member</span>
                <span className="text-[#F2F3F5] font-bold">
                  {pc.activeSession.memberName || pc.activeSession.guestName || "Guest"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">Active Game</span>
                <span className="text-[#F2F3F5] font-semibold">
                  {pc.currentGame || pc.activeSession.currentGame || "Game"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">Duration / Remaining</span>
                <span className="text-persona-red font-bold font-mono">
                  {pc.activeSession.durationMinutes}m ({pc.activeSession.remainingMinutes}m left)
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">Session Amount</span>
                <span className="text-[#F2F3F5] font-bold font-mono">
                  {formatRupiah(pc.activeSession.totalPrice)}
                </span>
              </div>
            </div>

            {/* Session Action Controls */}
            <div className="flex items-center gap-2 pt-2 border-t border-surface-border">
              {onEndSession && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  className="flex-1 text-xs"
                  onClick={() => onEndSession(pc)}
                >
                  Checkout & Pay
                </Button>
              )}
              {onStopSession && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs text-persona-red border-persona-red-border hover:bg-persona-red hover:text-white"
                  onClick={async () => {
                    if (!confirm(`Stop active session for ${pc.stationNumber}?`)) return;
                    try {
                      setIsUpdating(true);
                      await onStopSession(pc.activeSession!.id);
                      onClose();
                    } catch (err: unknown) {
                      setErrorMsg(err instanceof Error ? err.message : "Failed to stop session");
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  disabled={isUpdating}
                >
                  Stop Session
                </Button>
              )}
            </div>
          </>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-secondary">
                {pc.status === "AVAILABLE"
                  ? "No active session"
                  : pc.status === "MAINTENANCE"
                  ? "Station under maintenance"
                  : "Station offline"}
              </span>
              <span className="text-[#F2F3F5] font-bold font-mono">
                Rate: {formatRupiah(pc.hourlyRate)} / hr
              </span>
            </div>
          )}
        </div>

        {/* Secondary Section: Hardware Information */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block font-sans">
            Hardware Specifications
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">CPU</span>
              <span className="text-[#F2F3F5] text-xs font-medium truncate block">{pc.specsCpu}</span>
            </div>
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">GPU</span>
              <span className="text-[#F2F3F5] text-xs font-medium truncate block">{pc.specsGpu}</span>
            </div>
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">RAM</span>
              <span className="text-[#F2F3F5] text-xs font-medium">{pc.specsRam}</span>
            </div>
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">Monitor</span>
              <span className="text-[#F2F3F5] text-xs font-medium truncate block">{pc.specsMonitor}</span>
            </div>
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">Storage</span>
              <span className="text-[#F2F3F5] text-xs font-medium">{pc.specsStorage}</span>
            </div>
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
              <span className="text-[10px] text-text-muted uppercase block font-semibold">Peripherals</span>
              <span className="text-[#F2F3F5] text-xs font-medium truncate block">{pc.specsPeripherals}</span>
            </div>
          </div>
        </div>

        {/* Network & Diagnostics */}
        <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px] flex items-center justify-between text-xs font-mono text-text-secondary">
          <span>IP: <strong className="text-[#F2F3F5] font-semibold">{pc.ipAddress || "-"}</strong></span>
          <span>MAC: <strong className="text-[#F2F3F5] font-semibold">{pc.macAddress || "-"}</strong></span>
        </div>

        {/* Status Control */}
        <div className="pt-2.5 border-t border-surface-border">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5 font-sans">
            Update Station Status
          </span>
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PCStatus)}
              className="flex-1 bg-surface-muted border border-surface-border rounded-[6px] px-3 py-1.5 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red cursor-pointer"
            >
              <option value="">Select status...</option>
              <option value="AVAILABLE" disabled={pc.status === "AVAILABLE"}>
                AVAILABLE
              </option>
              <option value="MAINTENANCE" disabled={pc.status === "MAINTENANCE" || pc.status === "IN_USE"}>
                MAINTENANCE
              </option>
              <option value="OFFLINE" disabled={pc.status === "OFFLINE" || pc.status === "IN_USE"}>
                OFFLINE
              </option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUpdateStatus}
              disabled={!selectedStatus || isUpdating}
              isLoading={isUpdating}
            >
              Update
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
