import { Sparkles } from "lucide-react";
import clsx from "../utils/clsx";

export function AssistantAvatar({ className = "" }) {
  return (
    <div
      className={clsx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper",
        className
      )}
    >
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

export function UserAvatar({ email, className = "" }) {
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <div
      className={clsx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-500 text-sm font-medium text-white",
        className
      )}
    >
      {initial}
    </div>
  );
}
