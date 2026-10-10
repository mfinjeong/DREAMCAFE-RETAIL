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
    "inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-md select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange btn-press";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-xs px-3.5 py-2 gap-1.5",
    lg: "text-sm px-4.5 py-2.5 gap-2",
  };

  const variantStyles = {
    primary:
      "bg-orange hover:bg-orange-hover active:bg-orange-active text-white border border-orange-border shadow-sm",
    p3r:
      "bg-maroon hover:bg-maroon-hover active:bg-maroon-active text-white border border-maroon-border shadow-sm",
    secondary:
      "bg-surface hover:bg-surface-hover text-text-primary border border-surface-border active:bg-surface-muted",
    danger:
      "bg-coffee-subtle hover:bg-coffee text-coffee hover:text-white border border-coffee-border",
    outline:
      "bg-transparent hover:bg-orange-subtle text-text-secondary hover:text-orange border border-surface-border hover:border-orange-border",
    ghost:
      "bg-transparent hover:bg-orange-subtle text-text-secondary hover:text-orange",
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
