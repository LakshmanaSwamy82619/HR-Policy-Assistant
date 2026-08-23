import { useEffect, useState } from "react";
import { X, Clock, ChevronDown, ChevronUp, Zap } from "lucide-react";
import Badge from "./Badge";
import toast from "react-hot-toast";
import { getConversationMessages } from "../services/adminConversationsService";

const STAGE_LABELS = { classify_ms: "Intent classification", retrieval_ms: "Policy retrieval", agent_ms: "Agent/LLM run" };
const STAGE_ORDER = ["classify_ms", "retrieval_ms", "agent_ms"];
const STAGE_COLOR = { classify_ms: "bg-sky-400", retrieval_ms: "bg-amber-400", agent_ms: "bg-moss-400" };

const ROUTE_TONE = { rag: "success", hris: "amber", escalation: "warn" };

/** Full-screen overlay: every message in a conversation, and - for each
 * assistant answer - the pipeline trace that produced it (predicted
 * intent, routing decision, retrieval query/scores/threshold, stage
 * timings, system prompt). Reads debug_trace captured and persisted at
 * answer time in app/agent/graph.py, so this reflects exactly what
 * happened for that specific historical query - not a general
 * description of the pipeline. */
export default function AdminPipelineDrawer({ conversation, onClose }) {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    if (!conversation) return;
    setLoading(true);
    getConversationMessages(conversation.id)
      .then((data) => {
        setTurns(data.turns);
        const lastTraced = [...data.turns].reverse().find((t) => t.role === "assistant" && t.debug_trace);
        if (lastTraced) setExpanded(new Set([lastTraced.id]));
      })
      .catch((e) => toast.error(e.message || "Couldn't load pipeline history"))
      .finally(() => setLoading(false));
  }, [conversation]);

  if (!conversation) return null;

  const toggle = (id) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4 py-6 animate-fadeIn">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl2 border border-ink-600 bg-ink-900 shadow-card animate-riseIn">
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base text-paper">{conversation.title}</h3>
            <p className="mt-0.5 text-xs text-paper/50">
              {conversation.employee_name} · {conversation.employee_email}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-paper/50 hover:bg-white/10 hover:text-paper">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && <p className="text-sm text-paper/50">Loading pipeline history...</p>}
          {!loading && turns.length === 0 && <p className="text-sm text-paper/50">No messages in this conversation yet.</p>}

          <div className="space-y-4">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-moss-500 px-4 py-2.5 text-sm font-medium text-white">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="max-w-[95%] space-y-2">
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-ink-600 bg-ink-800 px-4 py-3 text-sm leading-relaxed text-paper">
                    {t.content}
                  </div>

                  {t.debug_trace ? (
                    <>
                      <button
                        onClick={() => toggle(t.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs text-paper/70 transition-colors hover:border-moss-400/50 hover:text-moss-300"
                      >
                        <Zap size={12} />
                        {expanded.has(t.id) ? "Hide pipeline trace" : "View pipeline trace"}
                        {expanded.has(t.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {t.debug_trace.timings_ms?.total_ms != null && (
                          <span className="ml-1 flex items-center gap-1 text-paper/50">
                            <Clock size={11} /> {t.debug_trace.timings_ms.total_ms} ms
                          </span>
                        )}
                      </button>
                      {expanded.has(t.id) && <PipelineTrace debug={t.debug_trace} />}
                    </>
                  ) : (
                    <p className="pl-1 text-[11px] text-paper/40">No pipeline trace recorded for this message.</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineTrace({ debug }) {
  const timings = debug.timings_ms || {};
  const totalMs = timings.total_ms || Object.values(timings).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0) || 1;
  const retrieval = debug.retrieval;

  return (
    <div className="animate-riseIn space-y-5 rounded-xl2 border border-ink-600 bg-ink-800/60 p-4">
      {/* Routing decision */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">intent: {debug.predicted_intent}</Badge>
        <Badge tone={ROUTE_TONE[debug.route_taken] || "neutral"}>route: {debug.route_taken}</Badge>
        {debug.tool_used && <Badge tone="amber">tool: {debug.tool_used}</Badge>}
        {debug.sensitive_category && <Badge tone="warn">sensitive: {debug.sensitive_category}</Badge>}
      </div>

      {/* Timing breakdown */}
      {Object.keys(timings).length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-paper/40">Stage timings</p>
          <div className="space-y-1.5">
            {STAGE_ORDER.filter((k) => timings[k] != null).map((k) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-36 shrink-0 text-paper/70">{STAGE_LABELS[k]}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-950">
                  <div
                    className={`h-full rounded-full ${STAGE_COLOR[k]}`}
                    style={{ width: `${Math.max(2, (timings[k] / totalMs) * 100)}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-paper/50">{timings[k]} ms</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-ink-700 pt-1.5 text-xs">
              <span className="text-paper/70">Total</span>
              <span className="font-mono text-paper">{timings.total_ms} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Retrieval detail */}
      {retrieval && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-paper/40">Retrieval</p>
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-xs text-paper/80">
            <span className="truncate">"{retrieval.query}"</span>
            <Badge tone={retrieval.confident ? "success" : "warn"}>
              {retrieval.confident ? "confident" : "below threshold"}
            </Badge>
            <span className="text-paper/40">threshold {retrieval.similarity_threshold}</span>
          </div>
          {retrieval.candidates?.length > 0 && (
            <div className="space-y-1.5">
              {retrieval.candidates.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-2 ${
                    c.used_in_context ? "border-moss-400/40 bg-moss-400/5" : "border-ink-600 bg-ink-950/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-paper">
                      {c.document_title ? `${c.document_title} · ` : ""}
                      {c.section_title || c.section_id}
                    </span>
                    {c.used_in_context && <Badge tone="success">used</Badge>}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-paper/50">vector score {c.vector_score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System prompt preview */}
      {debug.system_prompt && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-paper/40">System prompt (preview)</p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-ink-600 bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-paper/70">
            {debug.system_prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
