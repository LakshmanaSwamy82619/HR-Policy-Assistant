import clsx from "../utils/clsx";

export default function Skeleton({ className = "" }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-gradient-to-r from-paper-dim via-line/60 to-paper-dim bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "shimmer 1.6s ease-in-out infinite" }}
    />
  );
}

// Inline keyframes injected once — keeps the component self-contained
// without editing the global stylesheet for a single shimmer effect.
if (typeof document !== "undefined" && !document.getElementById("skeleton-shimmer-kf")) {
  const style = document.createElement("style");
  style.id = "skeleton-shimmer-kf";
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
  document.head.appendChild(style);
}
