import { Loader2 } from "lucide-react";
import clsx from "../utils/clsx";

const variants = {
  primary: "bg-moss-500 text-white hover:bg-moss-600 active:bg-moss-700 shadow-soft disabled:bg-moss-500/50",
  secondary: "bg-ink text-paper hover:bg-ink-700 active:bg-ink-600 shadow-soft disabled:bg-ink/50",
  outline: "border border-line bg-white text-ink hover:border-ink/30 hover:bg-paper-dim disabled:opacity-50",
  ghost: "text-ink2 hover:bg-paper-dim hover:text-ink disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
};

const sizes = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-5 py-3 gap-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}
