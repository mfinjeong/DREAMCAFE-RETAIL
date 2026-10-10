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
    default: "bg-[#111317] text-[#8A909A] border-[#22252A]",
    success: "bg-[#141715] text-[#9CB1A3] border-[#232B25]",
    warning: "bg-[#1C1813] text-[#BFA779] border-[#332A1C]",
    danger: "bg-[#1E1214] text-[#D15E65] border-[#3B1C20]",
    info: "bg-[#111317] text-[#8A909A] border-[#22252A]",
    outline: "bg-transparent text-[#8A909A] border-[#22252A]",
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
