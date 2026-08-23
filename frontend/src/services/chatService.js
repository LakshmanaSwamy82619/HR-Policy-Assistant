import api from "./api";

// POST /chat — conversation_id is omitted to start a new conversation.
export async function sendMessage(message, conversationId) {
  const { data } = await api.post("/chat", {
    message,
    conversation_id: conversationId || undefined,
  });
  return data;
}

// GET /chat/{conversation_id}/history
export async function getHistory(conversationId) {
  const { data } = await api.get(`/chat/${conversationId}/history`);
  return data;
}

// GET /chat/conversations?status=active|archived
export async function listConversations(status = "active") {
  const { data } = await api.get("/chat/conversations", { params: { status_filter: status } });
  return data;
}

// POST /chat/conversations/{id}/archive — soft delete
export async function archiveConversation(conversationId) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/archive`);
  return data;
}

// POST /chat/conversations/{id}/restore-requests
export async function requestRestore(conversationId, note) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/restore-requests`, { note });
  return data;
}
