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
            error ? "border-persona-red" : "border-surface-border focus:border-persona-red"
          } rounded-[6px] px-3 py-1.5 text-xs text-[#F2F3F5] placeholder-text-muted transition-colors focus:outline-none disabled:opacity-50 disabled:bg-surface ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-[11px] text-persona-red font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
