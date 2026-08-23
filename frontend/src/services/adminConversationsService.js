import api from "./api";

// GET /admin/conversations?status=&employee_id=
export async function listAllConversations({ status, employeeId } = {}) {
  const { data } = await api.get("/admin/conversations", {
    params: { status: status || undefined, employee_id: employeeId || undefined },
  });
  return data;
}

// GET /admin/conversations/{id}/messages — full turns including debug_trace
export async function getConversationMessages(conversationId) {
  const { data } = await api.get(`/admin/conversations/${conversationId}/messages`);
  return data;
}
