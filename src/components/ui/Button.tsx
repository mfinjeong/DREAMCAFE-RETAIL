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
    "inline-flex items-center justify-center font-semibold transition-colors duration-150 rounded-md select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-xs px-3.5 py-2 gap-1.5",
    lg: "text-sm px-4.5 py-2.5 gap-2",
  };

  const variantStyles = {
    primary:
      "bg-coffee hover:bg-coffee-hover active:bg-coffee-hover text-white border border-coffee-border",
    p3r:
      "bg-sage hover:bg-sage-hover active:bg-sage-hover text-white border border-sage-border",
    secondary:
      "bg-surface hover:bg-surface-hover text-text-primary border border-surface-border active:bg-surface-muted",
    danger:
      "bg-coffee-subtle hover:bg-coffee-subtle text-coffee border border-coffee-border",
    outline:
      "bg-transparent hover:bg-surface text-text-secondary hover:text-text-primary border border-surface-border",
    ghost:
      "bg-transparent hover:bg-surface text-text-secondary hover:text-text-primary",
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
