import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, RefreshCcw, CheckCircle2, Send, Zap, ChevronDown, ChevronUp, Clock, ExternalLink, Copy } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { UserAvatar } from "../../components/Avatar";
import { listAllTickets, updateTicket, postAdminTicketMessage } from "../../services/adminTicketsService";

const STATUS_TONE = {
  open: "warn",
  in_progress: "amber",
  resolved: "success",
  closed: "neutral",
};

const STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const REASON_LABEL = {
  low_confidence: "Low confidence answer",
  sensitive_topic: "Sensitive topic",
  system_error: "System error",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STAGE_LABELS = { classify_ms: "Intent classification", retrieval_ms: "Policy retrieval", agent_ms: "Agent/LLM run" };
const STAGE_ORDER = ["classify_ms", "retrieval_ms", "agent_ms"];
const ROUTE_TONE = { rag: "success", hris: "amber", escalation: "warn" };

/** Why this specific ticket got raised - predicted intent, routing
 * decision, retrieval scores vs. the confidence threshold, and stage
 * timings, captured at the exact moment the agent escalated (see
 * pipeline_trace on the ticket, built in app/agent/graph.py). Also links
 * out to the full LangSmith trace when tracing is enabled, so HR can see
 * every underlying LLM/tool call for that turn. */
function TicketTraceSection({ ticket }) {
  const [open, setOpen] = useState(false);
  const trace = ticket.pipeline_trace;

  if (!trace && !ticket.langsmith_run_id) return null;

  const timings = trace?.timings_ms || {};
  const totalMs = timings.total_ms || Object.values(timings).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0) || 1;
  const retrieval = trace?.retrieval;

  const copyRunId = () => {
    navigator.clipboard?.writeText(ticket.langsmith_run_id);
    toast.success("Run ID copied");
  };

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink2 transition-colors hover:border-moss-500/50 hover:text-moss-600"
      >
        <Zap size={12} />
        {open ? "Hide why this escalated" : "Why did this escalate?"}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {timings.total_ms != null && (
          <span className="ml-1 flex items-center gap-1 text-ink2/70">
            <Clock size={11} /> {timings.total_ms} ms
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded-lg border border-line bg-paper-dim/50 p-3.5">
          {trace && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">intent: {trace.predicted_intent}</Badge>
              <Badge tone={ROUTE_TONE[trace.route_taken] || "neutral"}>route: {trace.route_taken}</Badge>
              {trace.tool_used && <Badge tone="amber">tool: {trace.tool_used}</Badge>}
              {trace.sensitive_category && <Badge tone="warn">sensitive: {trace.sensitive_category}</Badge>}
              {trace.error && <Badge tone="danger">error</Badge>}
            </div>
          )}

          {Object.keys(timings).length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink2/60">Stage timings</p>
              <div className="space-y-1.5">
                {STAGE_ORDER.filter((k) => timings[k] != null).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-36 shrink-0 text-ink2">{STAGE_LABELS[k]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full bg-moss-500"
                        style={{ width: `${Math.max(2, (timings[k] / totalMs) * 100)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-ink2">{timings[k]} ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {retrieval && (
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink2/60">Retrieval</p>
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs text-ink">
                <span className="truncate">"{retrieval.query}"</span>
                <Badge tone={retrieval.confident ? "success" : "warn"}>
                  {retrieval.confident ? "confident" : "below threshold"}
                </Badge>
                <span className="text-ink2/70">threshold {retrieval.similarity_threshold}</span>
              </div>
              {retrieval.candidates?.length > 0 && (
                <div className="space-y-1.5">
                  {retrieval.candidates.map((c, i) => (
                    <div
                      key={i}
                      className={
                        "rounded-lg border px-3 py-2 " +
                        (c.used_in_context ? "border-moss-300 bg-moss-50/60" : "border-line bg-white/60")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-ink">
                          {c.document_title ? `${c.document_title} · ` : ""}
                          {c.section_title || c.section_id}
                        </span>
                        {c.used_in_context && <Badge tone="success">used</Badge>}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-ink2/70">vector score {c.vector_score}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {trace?.error && (
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink2/60">Error</p>
              <pre className="whitespace-pre-wrap rounded-lg border border-danger/20 bg-danger/5 p-2.5 font-mono text-[11px] text-danger">
                {trace.error}
              </pre>
            </div>
          )}

          {(ticket.langsmith_trace_url || ticket.langsmith_run_id) && (
            <div className="flex items-center gap-2 border-t border-line pt-3">
              {ticket.langsmith_trace_url ? (
                <a
                  href={ticket.langsmith_trace_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90"
                >
                  <ExternalLink size={12} /> Open full trace in LangSmith
                </a>
              ) : (
                <>
                  <span className="font-mono text-[11px] text-ink2/70">Run: {ticket.langsmith_run_id}</span>
                  <button
                    onClick={copyRunId}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] text-ink2 hover:text-ink"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionModal({ ticket, onClose, onSaved }) {
  const [status, setStatus] = useState(ticket.status);
  const [note, setNote] = useState(ticket.resolution_note || "");
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [messages, setMessages] = useState(ticket.messages || []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTicket(ticket.id, { status, resolutionNote: note });
      toast.success("Ticket updated");
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || "Couldn't update ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSendingReply(true);
    try {
      const updated = await postAdminTicketMessage(ticket.id, reply.trim());
      setMessages(updated.messages || []);
      setReply("");
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || "Couldn't send message");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Action ticket"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} icon={CheckCircle2}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-xs text-ink2">{ticket.id}</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {ticket.employee_name} · {ticket.employee_email}
          </p>
          <p className="mt-0.5 text-xs text-ink2">
            {REASON_LABEL[ticket.reason] || ticket.reason}
            {ticket.topic_category ? ` · ${ticket.topic_category}` : ""}
          </p>
        </div>

        <TicketTraceSection ticket={ticket} />

        {messages.length > 0 && (
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border border-line bg-paper-dim/50 p-3">
            {messages.map((m) => (
              <div key={m.id} className={"flex " + (m.sender_role === "admin" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] rounded-lg px-3 py-1.5 text-xs " +
                    (m.sender_role === "admin" ? "bg-ink text-paper" : "bg-white text-ink border border-line")
                  }
                >
                  <p className="mb-0.5 font-medium opacity-70">{m.sender_role === "admin" ? "You (HR)" : ticket.employee_name}</p>
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendReply} className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Ask the employee something..."
            className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink2/70 focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20"
          />
          <Button type="submit" size="sm" variant="outline" icon={Send} loading={sendingReply} disabled={!reply.trim()}>
            Send
          </Button>
        </form>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Response to employee
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Visible to the employee on their Tickets page as soon as you save."
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink2/70 focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20"
          />
        </div>
      </div>
    </Modal>
  );
}

function TicketRow({ ticket, onAction }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <UserAvatar email={ticket.employee_email} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{ticket.employee_name}</p>
        <p className="truncate text-xs text-ink2">
          {REASON_LABEL[ticket.reason] || ticket.reason}
          {ticket.topic_category ? ` · ${ticket.topic_category}` : ""}
        </p>
      </div>
      <span className="hidden shrink-0 font-mono text-xs text-ink2 sm:block">
        {new Date(ticket.created_at).toLocaleString()}
      </span>
      {ticket.pipeline_trace && (
        <span title="Pipeline trace available" className="shrink-0 text-moss-500">
          <Zap size={14} />
        </span>
      )}
      <Badge tone={STATUS_TONE[ticket.status?.toLowerCase()] || "neutral"}>
        {STATUS_LABEL[ticket.status] || ticket.status}
      </Badge>
      <Button variant="outline" size="sm" onClick={() => onAction(ticket)}>
        Action
      </Button>
    </div>
  );
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  const load = async (statusFilter = filter) => {
    setLoading(true);
    try {
      const data = await listAllTickets(statusFilter || undefined);
      setTickets(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openCount = useMemo(() => tickets.filter((t) => t.status === "open").length, [tickets]);

  const handleSaved = (updated) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTicket(null);
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">HR ticket queue</h1>
              <p className="mt-1.5 text-sm text-ink2">
                Escalations raised across all employees.{" "}
                {openCount > 0 && <span className="font-medium text-warn">{openCount} open</span>}
              </p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCcw} onClick={() => load(filter)}>
              Refresh
            </Button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (filter === f.value
                    ? "border-moss-500 bg-moss-50 text-moss-600"
                    : "border-line bg-white text-ink2 hover:text-ink")
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <EmptyState
              icon={LifeBuoy}
              title="No tickets"
              description="Escalations created automatically by the assistant, or by employees, will show up here for HR to action."
            />
          )}

          {!loading && tickets.length > 0 && (
            <Card className="animate-fadeUp !p-0 overflow-hidden">
              <div className="divide-y divide-line">
                {tickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} onAction={setActiveTicket} />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {activeTicket && (
        <ActionModal
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onSaved={handleSaved}
        />
      )}
    </AppShell>
  );
}