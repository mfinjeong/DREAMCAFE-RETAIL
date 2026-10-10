"use client";

import React, { useState, useEffect } from "react";
import { PCStation } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah, formatCountdown } from "@/lib/formatters";

interface PCStationCardProps {
  pc: PCStation;
  onStartSession?: (pc: PCStation) => void;
  onViewDetail?: (pc: PCStation) => void;
  onEndSession?: (pc: PCStation) => void;
  onAddTime?: (pc: PCStation) => void;
}

export const PCStationCard: React.FC<PCStationCardProps> = ({
  pc,
  onStartSession,
  onViewDetail,
  onEndSession,
  onAddTime,
}) => {
  // Live ticking countdown calculation
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (pc.status === "IN_USE" && pc.activeSession) {
      const start = new Date(pc.activeSession.startTime).getTime();
      const durationMs = pc.activeSession.durationMinutes * 60 * 1000;
      const end = start + durationMs;
      const leftSec = Math.max(0, Math.floor((end - Date.now()) / 1000));
      return leftSec > 0 ? leftSec : pc.activeSession.remainingMinutes * 60;
    }
    return 0;
  });

  useEffect(() => {
    if (pc.status !== "IN_USE") return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [pc.status]);

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-surface-border hover:border-surface-hover bg-surface p-3.5 flex flex-col justify-between transition-colors select-none">
      {/* Subtle Persona-inspired angular corner graphic wedge in top-right */}
      {pc.status === "IN_USE" ? (
        <span
          className="absolute top-0 right-0 w-3.5 h-3.5 bg-persona-red"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          title="Active Station"
        />
      ) : pc.status === "AVAILABLE" ? (
        <span
          className="absolute top-0 right-0 w-3.5 h-3.5 bg-p3r-blue"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          title="Available Station"
        />
      ) : pc.status === "MAINTENANCE" ? (
        <span
          className="absolute top-0 right-0 w-3.5 h-3.5 bg-pamber"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          title="Maintenance Station"
        />
      ) : (
        <span
          className="absolute top-0 right-0 w-3.5 h-3.5 bg-surface-border"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />
      )}

      {/* Top: Station & Zone */}
      <div className="flex items-center justify-between pr-2">
        <span className="text-sm font-extrabold text-[#F2F3F5] tracking-tight font-sans">
          {pc.stationNumber}
        </span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded-[3px]">
          {pc.zone}
        </span>
      </div>

      {/* Status indicator */}
      <div className="mt-2.5">
        <StatusBadge status={pc.status} />
      </div>

      {/* Middle: Content */}
      <div className="my-2.5 py-2.5 border-t border-b border-surface-border min-h-[66px] flex flex-col justify-center">
        {pc.status === "IN_USE" ? (
          <div className="space-y-1">
            <div className="font-bold text-[#F2F3F5] text-xs truncate font-sans">
              {pc.activeSession?.memberName || pc.activeSession?.guestName || "Guest"}
            </div>
            <div className="text-text-secondary text-[11px] truncate">
              {pc.currentGame || pc.activeSession?.currentGame || "Game"}
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
              <span className="text-persona-red font-bold font-tabular">
                {formatCountdown(secondsRemaining)}
              </span>
              <span className="text-text-secondary font-semibold font-tabular">
                {formatRupiah(pc.activeSession?.totalPrice || pc.hourlyRate)}
              </span>
            </div>
          </div>
        ) : pc.status === "AVAILABLE" ? (
          <div className="py-1">
            <span className="text-xs font-mono text-text-secondary block">
              {formatRupiah(pc.hourlyRate)} / hour
            </span>
          </div>
        ) : pc.status === "MAINTENANCE" ? (
          <div className="py-1">
            <span className="text-xs text-pamber font-medium block">
              Under maintenance
            </span>
          </div>
        ) : (
          <div className="py-1">
            <span className="text-xs text-text-muted block">
              Offline
            </span>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div>
        {pc.status === "AVAILABLE" ? (
          <button
            onClick={() => onStartSession?.(pc)}
            className="w-full bg-persona-red hover:bg-persona-red-hover active:bg-persona-red-active text-white text-xs font-bold py-1.5 px-3 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer"
          >
            START
          </button>
        ) : pc.status === "IN_USE" ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onEndSession?.(pc)}
              className="w-full bg-persona-red hover:bg-persona-red-hover active:bg-persona-red-active text-white text-[11px] font-bold py-1.5 px-2 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer text-center"
              title="End / Checkout Session"
            >
              STOP
            </button>
            <button
              onClick={() => onViewDetail?.(pc)}
              className="w-full bg-surface-muted hover:bg-surface-hover text-[#F2F3F5] border border-surface-border text-[11px] font-semibold py-1.5 px-2 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer text-center"
              title="View Station Detail"
            >
              DETAIL
            </button>
          </div>
        ) : (
          <button
            onClick={() => onViewDetail?.(pc)}
            className="w-full bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] border border-surface-border text-xs font-semibold py-1.5 px-3 rounded-[6px] transition-colors uppercase tracking-wider font-sans cursor-pointer"
          >
            VIEW
          </button>
        )}
      </div>
    </div>
  );
};
