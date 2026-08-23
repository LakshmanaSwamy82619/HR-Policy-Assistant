import { useEffect, useState } from "react";
import { LifeBuoy, RefreshCcw, Search, AlertCircle, MessageSquareText, Send } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { getTicket, listMyTickets, postTicketMessage } from "../services/escalationService";

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

function ThreadMessage({ msg }) {
  const isAdmin = msg.sender_role === "admin";
  return (
    <div className={"flex " + (isAdmin ? "justify-start" : "justify-end")}>
      <div
        className={
          "max-w-[85%] rounded-xl px-3 py-2 text-sm " +
          (isAdmin ? "bg-moss-50 text-ink" : "bg-ink text-paper")
        }
      >
        <p className={"mb-0.5 text-[11px] font-medium " + (isAdmin ? "text-moss-600" : "text-paper/60")}>
          {isAdmin ? `HR · ${msg.sender_name}` : "You"}
        </p>
        <p className="whitespace-pre-wrap">{msg.message}</p>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onSent }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const canReply = ticket.status === "open" || ticket.status === "in_progress";

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await postTicketMessage(ticket.id, reply.trim());
      setReply("");
      onSent(updated);
    } catch (err) {
      toast.error(err.message || "Couldn't send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="animate-fadeUp">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-ink2">{ticket.id}</p>
          <p className="mt-1.5 text-sm font-medium text-ink">
            {REASON_LABEL[ticket.reason] || ticket.reason}
          </p>
          {ticket.topic_category && (
            <p className="mt-0.5 text-xs text-ink2">Category: {ticket.topic_category}</p>
          )}
        </div>
        <Badge tone={STATUS_TONE[ticket.status?.toLowerCase()] || "neutral"}>
          {STATUS_LABEL[ticket.status] || ticket.status}
        </Badge>
      </div>

      {ticket.resolution_note && (
        <div className="mt-3 flex gap-2 rounded-lg bg-paper-dim px-3 py-2.5">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-moss-600" />
          <div>
            <p className="text-xs font-medium text-ink">Response from HR</p>
            <p className="mt-0.5 text-sm text-ink2">{ticket.resolution_note}</p>
          </div>
        </div>
      )}

      {ticket.messages?.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          {ticket.messages.map((m) => (
            <ThreadMessage key={m.id} msg={m} />
          ))}
        </div>
      )}

      {canReply && (
        <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-line pt-3">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to HR..."
            className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink2/70 focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20"
          />
          <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!reply.trim()}>
            Send
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await listMyTickets();
      setTickets(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleTicketUpdated = (updated) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Manual lookup stays useful if someone shares a ticket id (e.g. from an
  // email) that isn't the employee's own - the backend still 404s on
  // tickets that don't belong to them.
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLooking(true);
    setLookupError("");
    try {
      const ticket = await getTicket(lookupId.trim());
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      setLookupId("");
      toast.success("Ticket found");
    } catch (err) {
      setLookupError(err.message || "Ticket not found");
    } finally {
      setLooking(false);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">HR tickets</h1>
              <p className="mt-1.5 text-sm text-ink2">
                Escalations created for you, either automatically or by request. Reply here if HR asks
                for more information.
              </p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCcw} onClick={loadAll}>
              Refresh
            </Button>
          </div>

          <Card className="mb-6">
            <form onSubmit={handleLookup} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Look up a ticket by ID"
                  placeholder="e.g. 3f1a9c2e-..."
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  error={lookupError}
                  icon={Search}
                />
              </div>
              <Button type="submit" loading={looking} variant="outline">
                Find
              </Button>
            </form>
          </Card>

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <EmptyState
              icon={LifeBuoy}
              title="No tickets yet"
              description="When the assistant escalates a question to HR — or you ask it to — the ticket will show up here."
            />
          )}

          {!loading && tickets.length > 0 && (
            <div className="flex flex-col gap-3">
              {tickets.map((t) =>
                t.status === "unavailable" ? (
                  <Card key={t.id} className="border-danger/20 bg-danger/5">
                    <div className="flex items-center gap-2 text-sm text-danger">
                      <AlertCircle className="h-4 w-4" />
                      Couldn't load ticket <span className="font-mono text-xs">{t.id}</span>
                    </div>
                  </Card>
                ) : (
                  <TicketCard key={t.id} ticket={t} onSent={handleTicketUpdated} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
