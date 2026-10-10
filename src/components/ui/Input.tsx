import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-surface-muted border ${
            error ? "border-coffee" : "border-surface-border focus:border-sage"
          } rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 disabled:opacity-50 disabled:bg-surface ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-[11px] text-coffee font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
