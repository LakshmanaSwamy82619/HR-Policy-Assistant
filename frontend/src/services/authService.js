import api from "./api";

// POST /auth/login -> { access_token, token_type }
export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

// PATCH /auth/me/password — self-service password change
export async function changePassword(currentPassword, newPassword) {
  await api.patch("/auth/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
