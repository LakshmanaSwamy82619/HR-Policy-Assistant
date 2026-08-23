import { useEffect, useState } from "react";
import { MessageSquare, RefreshCcw, Zap } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { UserAvatar } from "../../components/Avatar";
import AdminPipelineDrawer from "../../components/AdminPipelineDrawer";
import { listAllConversations } from "../../services/adminConversationsService";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export default function AdminConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(null);

  const load = async (statusFilter = filter) => {
    setLoading(true);
    try {
      const data = await listAllConversations({ status: statusFilter || undefined });
      setConversations(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">Conversations & pipeline</h1>
              <p className="mt-1.5 text-sm text-ink2">
                Every employee conversation, with the agent's routing and retrieval trace behind each
                answer - what it decided, what it retrieved, and how confident it was.
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

          {!loading && conversations.length === 0 && (
            <EmptyState icon={MessageSquare} title="No conversations" description="Nothing to show for this filter yet." />
          )}

          {!loading && conversations.length > 0 && (
            <Card className="animate-fadeUp !p-0 overflow-hidden">
              <div className="divide-y divide-line">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper-dim"
                  >
                    <UserAvatar email={c.employee_email} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                      <p className="truncate text-xs text-ink2">
                        {c.employee_name} · {c.turn_count} messages
                      </p>
                    </div>
                    <Badge tone={c.status === "archived" ? "neutral" : "success"}>{c.status}</Badge>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-moss-600">
                      <Zap className="h-3.5 w-3.5" />
                      View trace
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {active && <AdminPipelineDrawer conversation={active} onClose={() => setActive(null)} />}
    </AppShell>
  );
}
