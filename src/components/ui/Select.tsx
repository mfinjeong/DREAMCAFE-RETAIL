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
            error ? "border-persona-red" : "border-surface-border focus:border-persona-red"
          } rounded-[6px] px-3 py-1.5 text-xs text-[#F2F3F5] transition-colors focus:outline-none disabled:opacity-50 disabled:bg-surface cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-[#F2F3F5]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-[11px] text-persona-red font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
