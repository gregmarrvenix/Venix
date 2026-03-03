"use client";

import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm text-slate-400">{label}</label>
        )}
        <select
          ref={ref}
          className={`rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
            error ? "border-red-400" : ""
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export default Select;
