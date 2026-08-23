import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, RefreshCcw, CheckCircle2, Send } from "lucide-react";
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
