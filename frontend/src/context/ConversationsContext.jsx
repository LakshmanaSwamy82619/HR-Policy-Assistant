import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { listConversations, archiveConversation as archiveConversationApi } from "../services/chatService";

const ConversationsContext = createContext(null);

// Server-backed via GET /chat/conversations?status=active. Archiving
// (soft delete) removes an entry from this list immediately - it isn't
// gone, just moved to the employee's Archived chats view.
export function ConversationsProvider({ children }) {
  const { employeeId, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setConversations([]);
      return;
    }
    try {
      const data = await listConversations("active");
      setConversations(
        data.map((c) => ({ id: c.id, title: c.title, updatedAt: new Date(c.started_at).getTime() }))
      );
    } catch {
      // Sidebar just stays as-is on a transient failure - not worth a toast.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [employeeId, refresh]);

  // Called after sending a message in a new or existing conversation so the
  // sidebar picks up the change without a full page reload.
  const upsertConversation = useCallback(() => {
    refresh();
  }, [refresh]);

  const archiveConversation = useCallback(async (id) => {
    await archiveConversationApi(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <ConversationsContext.Provider value={{ conversations, refresh, upsertConversation, archiveConversation }}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}
