// The backend only exposes GET /escalation/tickets/{id} — never a list of
// "my tickets" — so, like conversations, we keep a local index of ticket
// ids the client has seen (created during chat, or looked up manually) and
// hydrate their live status from the API when the Tickets page loads.
function key(employeeId) {
  return `hr_assistant_tickets_${employeeId}`;
}

export function getTrackedTicketIds(employeeId) {
  if (!employeeId) return [];
  try {
    return JSON.parse(localStorage.getItem(key(employeeId)) || "[]");
  } catch {
    return [];
  }
}

export function trackTicketId(employeeId, ticketId) {
  if (!employeeId || !ticketId) return;
  const existing = getTrackedTicketIds(employeeId);
  if (!existing.includes(ticketId)) {
    localStorage.setItem(key(employeeId), JSON.stringify([ticketId, ...existing]));
  }
}
