import React from "react";
import { PCStatus, SessionStatus, BookingStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: PCStatus | SessionStatus | BookingStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toUpperCase();

  let styles = "bg-surface-muted text-text-muted border-surface-border";
  let dotColor = "bg-text-muted";
  let label = s;

  if (s === "AVAILABLE") {
    styles = "bg-sage-subtle text-sage border-sage-border";
    dotColor = "bg-sage";
    label = "AVAILABLE";
  } else if (s === "IN_USE" || s === "ACTIVE") {
    styles = "bg-sage-subtle text-sage border-sage-border";
    dotColor = "bg-sage";
    label = "IN USE";
  } else if (s === "MAINTENANCE") {
    styles = "bg-pamber-subtle text-pamber border-pamber-border";
    dotColor = "bg-pamber";
    label = "MAINTENANCE";
  } else if (s === "OFFLINE") {
    styles = "bg-surface-muted text-text-muted border-surface-border";
    dotColor = "bg-text-muted";
    label = "OFFLINE";
  } else if (s === "COMPLETED" || s === "CONFIRMED") {
    styles = "bg-sage-subtle text-sage border-sage-border";
    dotColor = "bg-sage";
    label = s;
  } else if (s === "CANCELLED") {
    styles = "bg-coffee-subtle text-coffee border-coffee-border";
    dotColor = "bg-coffee";
    label = "CANCELLED";
  } else if (s === "PENDING") {
    styles = "bg-pamber-subtle text-pamber border-pamber-border";
    dotColor = "bg-pamber";
    label = "PENDING";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-[4px] border uppercase status-transition ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-[1px] ${dotColor}`}></span>
      <span>{label}</span>
    </span>
  );
};
