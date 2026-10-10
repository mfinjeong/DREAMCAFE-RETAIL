import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full bg-surface-muted border ${
            error ? "border-coffee" : "border-surface-border focus:border-sage"
          } rounded-md px-3 py-2 text-sm text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 disabled:opacity-50 disabled:bg-surface cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-[11px] text-coffee font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
