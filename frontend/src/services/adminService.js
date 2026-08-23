import api from "./api";

// GET /admin/policy-documents
export async function listPolicyDocuments() {
  const { data } = await api.get("/admin/policy-documents");
  return data;
}

// POST /admin/policy-documents (multipart)
export async function uploadPolicyDocument({ title, category, file }) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", category);
  formData.append("file", file);

  const { data } = await api.post("/admin/policy-documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// GET /admin/employees
export async function listEmployees() {
  const { data } = await api.get("/admin/employees");
  return data;
}

// POST /admin/employees
export async function createEmployee(payload) {
  const { data } = await api.post("/admin/employees", payload);
  return data;
}

// PATCH /admin/employees/{id} — edit profile fields, grant/revoke admin,
// or deactivate/reactivate. Only send the fields that changed.
export async function updateEmployee(employeeId, payload) {
  const { data } = await api.patch(`/admin/employees/${employeeId}`, payload);
  return data;
}
