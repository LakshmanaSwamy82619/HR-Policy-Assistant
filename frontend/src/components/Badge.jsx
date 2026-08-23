import clsx from "../utils/clsx";

const tones = {
  neutral: "bg-paper-dim text-ink2 border-line",
  moss: "bg-moss-50 text-moss-600 border-moss-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  success: "bg-success/10 text-success border-success/20",
  warn: "bg-warn/10 text-warn border-warn/20",
  danger: "bg-danger/10 text-danger border-danger/20",
};

export default function Badge({ children, tone = "neutral", className = "", icon: Icon }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
