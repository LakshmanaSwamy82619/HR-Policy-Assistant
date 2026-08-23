import { forwardRef } from "react";
import clsx from "../utils/clsx";

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = "", id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" />
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink2/70 transition-colors focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20",
            Icon && "pl-9",
            error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line",
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink2">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
