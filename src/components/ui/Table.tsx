import React from "react";

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className="w-full overflow-x-auto rounded-[8px] border border-surface-border bg-surface">
    <table className={`w-full text-left text-sm text-text-primary ${className}`}>{children}</table>
  </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-surface-muted text-sm font-semibold tracking-wider text-text-primary border-b border-surface-border">
    {children}
  </thead>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <tr className={`border-b border-surface-border hover:bg-surface-hover transition-colors duration-100 ${className}`}>
    {children}
  </tr>
);

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <th className={`px-3.5 py-2.5 font-bold text-text-primary ${className}`}>{children}</th>;

export const TableCell: React.FC<{ children?: React.ReactNode; className?: string; colSpan?: number }> = ({
  children,
  className = "",
  colSpan,
}) => (
  <td colSpan={colSpan} className={`px-3.5 py-2.5 text-text-primary ${className}`}>
    {children}
  </td>
);
