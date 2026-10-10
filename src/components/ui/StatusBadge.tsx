import React from "react";
import { PCStatus, SessionStatus, BookingStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: PCStatus | SessionStatus | BookingStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toUpperCase();

  let styles = "bg-surface text-text-muted border-surface-border";
  let dotColor = "bg-text-muted";
  let label = s;

  if (s === "AVAILABLE") {
    // Persona 3 Reload inspired blue/teal
    styles = "bg-p3r-blue-subtle text-p3r-blue border-p3r-blue-border/80";
    dotColor = "bg-p3r-blue";
    label = "AVAILABLE";
  } else if (s === "IN_USE" || s === "ACTIVE") {
    // Persona 5 inspired crimson red
    styles = "bg-persona-red-subtle text-persona-red border-persona-red-border/80";
    dotColor = "bg-persona-red";
    label = "IN USE";
  } else if (s === "MAINTENANCE") {
    styles = "bg-pamber-subtle text-pamber border-pamber-border/80";
    dotColor = "bg-pamber";
    label = "MAINTENANCE";
  } else if (s === "OFFLINE") {
    styles = "bg-surface text-text-muted border-surface-border";
    dotColor = "bg-text-muted";
    label = "OFFLINE";
  } else if (s === "COMPLETED" || s === "CONFIRMED") {
    styles = "bg-p3r-blue-subtle text-p3r-blue border-p3r-blue-border/80";
    dotColor = "bg-p3r-blue";
    label = s;
  } else if (s === "CANCELLED") {
    styles = "bg-persona-red-subtle text-persona-red border-persona-red-border/80";
    dotColor = "bg-persona-red";
    label = "CANCELLED";
  } else if (s === "PENDING") {
    styles = "bg-pamber-subtle text-pamber border-pamber-border/80";
    dotColor = "bg-pamber";
    label = "PENDING";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-[4px] border uppercase ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-[1px] persona-slash ${dotColor}`}></span>
      <span>{label}</span>
    </span>
  );
};
