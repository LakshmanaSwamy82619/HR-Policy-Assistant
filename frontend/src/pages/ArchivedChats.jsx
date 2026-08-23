import { useEffect, useState } from "react";
import { Archive, RefreshCcw, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { listConversations, requestRestore } from "../services/chatService";

const RESTORE_STATUS_TONE = {
  pending: "amber",
  approved: "success",
  rejected: "neutral",
};

const RESTORE_STATUS_LABEL = {
  pending: "Restore requested",
  approved: "Restored",
  rejected: "Restore declined",
};

function RestoreModal({ conversation, onClose, onRequested }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await requestRestore(conversation.id, note || undefined);
      toast.success("Restore requested - HR will review it");
      onRequested();
    } catch (err) {
      toast.error(err.message || "Couldn't request restore");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Request restore"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} icon={Undo2}>
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink2">
          "{conversation.title}" will stay archived until HR approves this request.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Optional: why you'd like this conversation back."
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink2/70 focus:border-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-500/20"
        />
      </div>
    </Modal>
  );
}

export default function ArchivedChats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listConversations("archived");
      setConversations(data);
    } catch (err) {
      toast.error(err.message || "Couldn't load archived chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-medium text-ink">Archived chats</h1>
              <p className="mt-1.5 text-sm text-ink2">
                Conversations you've removed from your sidebar. Nothing here is deleted - request a
                restore and HR can bring it back.
              </p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCcw} onClick={load}>
              Refresh
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <EmptyState
              icon={Archive}
              title="Nothing archived"
              description="Conversations you archive from the sidebar will show up here."
            />
          )}

          {!loading && conversations.length > 0 && (
            <div className="flex flex-col gap-3">
              {conversations.map((c) => (
                <Card key={c.id} className="animate-fadeUp flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                    <p className="mt-0.5 text-xs text-ink2">
                      Archived {c.archived_at ? new Date(c.archived_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.restore_request_status && (
                      <Badge tone={RESTORE_STATUS_TONE[c.restore_request_status]}>
                        {RESTORE_STATUS_LABEL[c.restore_request_status]}
                      </Badge>
                    )}
                    {(!c.restore_request_status || c.restore_request_status === "rejected") && (
                      <Button variant="outline" size="sm" icon={Undo2} onClick={() => setRestoreTarget(c)}>
                        Request restore
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {restoreTarget && (
        <RestoreModal
          conversation={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onRequested={() => {
            setRestoreTarget(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
}
