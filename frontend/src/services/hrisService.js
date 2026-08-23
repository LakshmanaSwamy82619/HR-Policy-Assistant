import api from "./api";

// GET /hris/me — the caller's own record only; the backend never accepts
// an employee id from the client.
export async function getMyRecord() {
  const { data } = await api.get("/hris/me");
  return data;
}
