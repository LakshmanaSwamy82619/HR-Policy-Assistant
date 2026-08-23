import api from "./api";

// GET /admin/tickets?status=&reason=
export async function listAllTickets({ status, reason } = {}) {
  const { data } = await api.get("/admin/tickets", {
    params: { status: status || undefined, reason: reason || undefined },
  });
  return data;
}

// PATCH /admin/tickets/{id} — HR actions a ticket: change status and/or
// leave a resolution note. The employee sees both immediately.
export async function updateTicket(ticketId, { status, resolutionNote }) {
  const { data } = await api.patch(`/admin/tickets/${ticketId}`, {
    status,
    resolution_note: resolutionNote,
  });
  return data;
}

// POST /admin/tickets/{id}/messages — HR asks the employee something while
// the ticket is open/in_progress.
export async function postAdminTicketMessage(ticketId, message) {
  const { data } = await api.post(`/admin/tickets/${ticketId}/messages`, { message });
  return data;
}
