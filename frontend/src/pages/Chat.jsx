import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import SuggestedPrompts from "../components/SuggestedPrompts";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationsContext";
import { getHistory, sendMessage } from "../services/chatService";
import { trackTicketId } from "../utils/ticketsStore";

function loadingMessageFor(text) {
  const lower = text.toLowerCase();
  if (/(sick|leave|vacation|pto|benefit|enroll)/.test(lower)) return "Looking up your HR record...";
  if (/(harass|terminat|medical leave|discriminat|legal)/.test(lower)) return "Connecting you with HR...";
  return "Searching policy documents for a grounded answer...";
}

export default function Chat() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const { email, employeeId } = useAuth();
  const { upsertConversation } = useConversations();

  const [conversationId, setConversationId] = useState(routeConversationId || null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(routeConversationId));
  const [pendingText, setPendingText] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    setConversationId(routeConversationId || null);
    if (!routeConversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    getHistory(routeConversationId)
      .then((data) => {
        if (cancelled) return;
        setMessages(
          data.turns.map((t, i) => ({
            id: `${routeConversationId}-${i}`,
            role: t.role,
            content: t.content,
            routeTaken: t.route_taken,
            citations: t.citation,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load that conversation");
      })
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [routeConversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = useCallback(
    async (text) => {
      const userMsg = { id: `u-${Date.now()}`, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setPendingText(text);
      setSending(true);

      try {
        const data = await sendMessage(text, conversationId);
        const assistantMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          routeTaken: data.route_taken,
          citations: data.citations,
          ticketId: data.ticket_id,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.ticket_id) trackTicketId(employeeId, data.ticket_id);

        if (!conversationId) {
          setConversationId(data.conversation_id);
          upsertConversation();
          navigate(`/chat/${data.conversation_id}`, { replace: true });
        } else {
          upsertConversation();
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: err.message || "Something went wrong reaching the assistant.",
            error: true,
            retryText: text,
          },
        ]);
        toast.error("Message failed to send");
      } finally {
        setSending(false);
        setPendingText("");
      }
    },
    [conversationId, navigate, upsertConversation, employeeId]
  );

  const handleRetry = (text) => {
    setMessages((prev) => prev.filter((m) => !m.error));
    handleSend(text);
  };

  const isEmpty = !loadingHistory && messages.length === 0;

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {loadingHistory && (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="ml-auto h-10 w-1/2" />
                <Skeleton className="h-20 w-3/4" />
              </div>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center gap-8 py-10 md:py-16">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-paper">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h1 className="font-display text-2xl font-medium text-ink">
                    What can I help you with, {email?.split("@")[0] || "there"}?
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
                    Ask a policy question, check something personal like your leave balance, or
                    get routed to HR for anything sensitive.
                  </p>
                </div>
                <SuggestedPrompts onPick={handleSend} />
              </div>
            )}

            {messages.map((m) =>
              m.error ? (
                <div key={m.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/10">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                  </div>
                  <ChatMessage
                    role="assistant"
                    content={m.content}
                    error
                    onRetry={() => handleRetry(m.retryText)}
                  />
                </div>
              ) : (
                <ChatMessage
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  routeTaken={m.routeTaken}
                  citations={m.citations}
                  ticketId={m.ticketId}
                  email={email}
                />
              )
            )}

            {sending && <TypingIndicator label={loadingMessageFor(pendingText)} />}
          </div>
        </div>

        <ChatInput onSend={handleSend} disabled={sending || loadingHistory} />
      </div>
    </AppShell>
  );
}
