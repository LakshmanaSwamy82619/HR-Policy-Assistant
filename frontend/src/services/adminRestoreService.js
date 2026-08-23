import api from "./api";

// GET /admin/restore-requests?status=
export async function listRestoreRequests(status) {
  const { data } = await api.get("/admin/restore-requests", {
    params: { status: status || undefined },
  });
  return data;
}

// PATCH /admin/restore-requests/{id} — action: "approve" | "reject" | "delete"
export async function actionRestoreRequest(requestId, action, adminNote) {
  const { data } = await api.patch(`/admin/restore-requests/${requestId}`, {
    action,
    admin_note: adminNote,
  });
  return data;
}
