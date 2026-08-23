import api from "./api";

// GET /escalation/tickets — every ticket raised for the logged-in employee,
// including its live status, HR's resolution note, and the full message
// thread once HR has actioned it.
export async function listMyTickets() {
  const { data } = await api.get("/escalation/tickets");
  return data;
}

// GET /escalation/tickets/{id}
export async function getTicket(ticketId) {
  const { data } = await api.get(`/escalation/tickets/${ticketId}`);
  return data;
}

// POST /escalation/tickets — used when an employee explicitly asks to
// talk to HR rather than waiting for the agent to escalate automatically.
export async function createTicket(conversationId, reason, topicCategory) {
  const { data } = await api.post("/escalation/tickets", {
    conversation_id: conversationId,
    reason,
    topic_category: topicCategory,
  });
  return data;
}

// POST /escalation/tickets/{id}/messages — employee replies on their own
// ticket thread (e.g. HR asked for the manager's name).
export async function postTicketMessage(ticketId, message) {
  const { data } = await api.post(`/escalation/tickets/${ticketId}/messages`, { message });
  return data;
}
