import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import * as authService from "../services/authService";
import { listEmployees } from "../services/adminService";
import { clearToken, getToken, registerUnauthorizedHandler, setToken } from "../services/api";

const AuthContext = createContext(null);

// The backend has no /auth/me endpoint — an employee's display name is
// never returned by the API. We keep the email the person typed at login
// (and re-derive it from the token's subject otherwise) rather than
// inventing profile data the backend doesn't provide.
const PROFILE_KEY = "hr_assistant_profile";

function readStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [profile, setProfile] = useState(() => readStoredProfile());
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const employeeId = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode(token).sub;
    } catch {
      return null;
    }
  }, [token]);

  // There's no role claim on the token and no /auth/me endpoint, so the
  // only honest way to know if the caller is an admin is to ask an
  // admin-only route and read whether it allows or refuses the call.
  const checkAdmin = useCallback(async () => {
    if (!getToken()) {
      setIsAdmin(false);
      return;
    }
    setCheckingAdmin(true);
    try {
      await listEmployees();
      setIsAdmin(true);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearToken();
      localStorage.removeItem(PROFILE_KEY);
      setTokenState(null);
      setProfile(null);
      setIsAdmin(false);
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (token) await checkAdmin();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const { access_token } = await authService.login(email, password);
    setToken(access_token);
    setTokenState(access_token);
    const nextProfile = { email };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    await checkAdmin();
    return access_token;
  }, [checkAdmin]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(PROFILE_KEY);
    setTokenState(null);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      employeeId,
      email: profile?.email || null,
      isAuthenticated: Boolean(token),
      isAdmin,
      checkingAdmin,
      ready,
      login,
      logout,
    }),
    [token, employeeId, profile, isAdmin, checkingAdmin, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
