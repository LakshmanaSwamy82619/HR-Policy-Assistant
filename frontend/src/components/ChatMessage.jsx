import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { BookMarked, LifeBuoy, RefreshCcw, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { AssistantAvatar, UserAvatar } from "./Avatar";
import RouteBadge from "./RouteBadge";
import clsx from "../utils/clsx";

function CitationTabs({ citations }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-line pt-3">
      {citations.map((c, i) => (
        <span key={i} className="cite-tab" title={c.section_title || c.document_title}>
          <BookMarked className="h-3 w-3" />
          {c.document_title} &middot; {c.section_id}
        </span>
      ))}
    </div>
  );
}

function TicketNote({ ticketId }) {
  if (!ticketId) return null;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-xs text-warn">
      <LifeBuoy className="h-3.5 w-3.5" />
      Ticket created &middot;{" "}
      <span className="font-mono">{ticketId.slice(0, 8)}</span>
    </div>
  );
}

export default function ChatMessage({ role, content, routeTaken, citations, ticketId, email, error, onRetry }) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied response");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={clsx("flex gap-3", isUser && "flex-row-reverse")}
    >
      {isUser ? <UserAvatar email={email} /> : <AssistantAvatar />}

      <div className={clsx("group max-w-[78%] md:max-w-[65%]", isUser && "flex flex-col items-end")}>
        {!isUser && routeTaken && (
          <div className="mb-1.5">
            <RouteBadge route={routeTaken} />
          </div>
        )}

        <div
          className={clsx(
            "rounded-xl2 px-4 py-3 text-[14.5px] leading-relaxed shadow-soft",
            isUser
              ? "rounded-tr-sm bg-ink text-paper"
              : error
              ? "rounded-tl-sm border border-danger/20 bg-danger/5 text-ink"
              : "rounded-tl-sm border border-line bg-white text-ink"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                  code: ({ children }) => (
                    <code className="rounded bg-paper-dim px-1 py-0.5 font-mono text-[13px]">{children}</code>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
              {error && onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-moss-600 hover:text-moss-700"
                >
                  <RefreshCcw className="h-3 w-3" /> Try again
                </button>
              )}
              <CitationTabs citations={citations} />
              <TicketNote ticketId={ticketId} />
            </div>
          )}
        </div>

        {!isUser && !error && (
          <button
            onClick={handleCopy}
            className="mt-1.5 flex items-center gap-1 self-start text-[11px] text-ink2 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
