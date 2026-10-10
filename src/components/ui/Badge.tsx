import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variantStyles = {
    default: "bg-surface-muted text-text-secondary border-surface-border",
    success: "bg-sage-subtle text-sage border-sage-border",
    warning: "bg-pamber-subtle text-pamber border-pamber-border",
    danger: "bg-coffee-subtle text-coffee border-coffee-border",
    info: "bg-surface-muted text-text-secondary border-surface-border",
    outline: "bg-transparent text-text-secondary border-surface-border",
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] border status-transition ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
