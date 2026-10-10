import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "interactive";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  className = "",
  ...props
}) => {
  const variantStyles = {
    default: "bg-surface border-surface-border",
    elevated: "bg-surface-hover border-surface-border",
    interactive: "bg-surface border-surface-border hover:border-surface-hover transition-colors cursor-pointer",
  };

  return (
    <div
      className={`rounded-[8px] border p-4 text-[#F2F3F5] ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
