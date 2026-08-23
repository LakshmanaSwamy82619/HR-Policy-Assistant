import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function TypingIndicator({ label = "Thinking through your policy question..." }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-xl2 rounded-tl-sm border border-line bg-white px-4 py-3 shadow-soft">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-500 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-moss-500 [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-ink2">{label}</span>
      </div>
    </motion.div>
  );
}
