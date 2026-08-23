import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line bg-paper/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl2 border border-line bg-white p-2 pl-4 shadow-soft transition-shadow focus-within:border-moss-500/50 focus-within:ring-2 focus-within:ring-moss-500/15">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about leave, benefits, reimbursement, or anything HR..."
          aria-label="Message the HR assistant"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink2/70 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-moss-500 text-white transition-all hover:bg-moss-600 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink2 active:scale-95"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-ink2/70">
        Sensitive topics are always routed to a human HR representative. This assistant can be wrong — verify anything critical.
      </p>
    </div>
  );
}
