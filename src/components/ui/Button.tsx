import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "p3r";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "sm",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-colors duration-100 rounded-[6px] select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer tracking-wide";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-xs px-3.5 py-2 gap-1.5",
    lg: "text-sm px-4.5 py-2.5 gap-2",
  };

  const variantStyles = {
    primary:
      "bg-persona-red hover:bg-persona-red-hover active:bg-persona-red-active text-white border border-persona-red/40",
    p3r:
      "bg-p3r-blue hover:bg-p3r-blue-hover active:bg-p3r-blue text-white border border-p3r-blue/40",
    secondary:
      "bg-surface hover:bg-surface-hover text-[#F2F3F5] border border-surface-border active:bg-surface-muted",
    danger:
      "bg-persona-red-subtle hover:bg-persona-red/30 text-persona-red border border-persona-red-border",
    outline:
      "bg-transparent hover:bg-surface text-text-secondary hover:text-[#F2F3F5] border border-surface-border",
    ghost:
      "bg-transparent hover:bg-surface text-text-secondary hover:text-[#F2F3F5]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "..." : children}
    </button>
  );
};
