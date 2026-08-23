import { useEffect, useState } from "react";
import { Inbox, RefreshCcw, Check, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { UserAvatar } from "../../components/Avatar";
import { listRestoreRequests, actionRestoreRequest } from "../../services/adminRestoreService";

const STATUS_TONE = { pending: "amber", approved: "success", rejected: "neutral" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminRestoreRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actingId, setActingId] = useState(null);

  const load = async (statusFilter = filter) => {
    setLoading(true);
    try {
      const data = await listRestoreRequests(statusFilter || undefined);
      setRequests(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load restore requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAction = async (req, action) => {
    if (action === "delete" && !window.confirm(`Permanently delete "${req.conversation_title}"? This can't be undone.`)) {
      return;
    }
    setActingId(req.id);
    try {
      await actionRestoreRequest(req.id, action);
      toast.success(
        action === "approve" ? "Conversation restored" : action === "reject" ? "Request rejected" : "Conversation deleted"
      );
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      toast.error(err.message || "Couldn't update request");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-medium text-ink">Restore requests</h1>
            <p className="mt-1.5 text-sm text-ink2">
              Employees ask for an archived conversation back here. Approve to un-archive it, reject to
              leave it archived, or delete to remove it permanently.
            </p>
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
            <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={() => load(filter)}>
              Refresh
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

          {!loading && requests.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="No requests"
              description="Employee restore requests for archived conversations will show up here."
            />
          )}

          {!loading && requests.length > 0 && (
            <div className="flex flex-col gap-3">
              {requests.map((r) => (
                <Card key={r.id} className="animate-fadeUp">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <UserAvatar email={r.employee_email} />
                      <div>
                        <p className="text-sm font-medium text-ink">{r.employee_name}</p>
                        <p className="text-xs text-ink2">{r.employee_email}</p>
                        <p className="mt-1.5 text-sm text-ink">"{r.conversation_title}"</p>
                        {r.note && <p className="mt-1 text-xs italic text-ink2">"{r.note}"</p>}
                      </div>
                    </div>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </div>

                  {r.status === "pending" && (
                    <div className="mt-4 flex gap-2 border-t border-line pt-3">
                      <Button
                        size="sm"
                        icon={Check}
                        loading={actingId === r.id}
                        onClick={() => handleAction(r, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={X}
                        loading={actingId === r.id}
                        onClick={() => handleAction(r, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        loading={actingId === r.id}
                        onClick={() => handleAction(r, "delete")}
                      >
                        Delete permanently
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
