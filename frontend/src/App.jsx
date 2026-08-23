import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { ConversationsProvider } from "./context/ConversationsContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Toaster from "./components/Toaster";

import Login from "./pages/Login";
import Chat from "./pages/Chat";
import MyRecord from "./pages/MyRecord";
import Tickets from "./pages/Tickets";
import ArchivedChats from "./pages/ArchivedChats";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Admin screens are only reached by a small subset of employees — split
// them out of the main bundle everyone else pays for.
const AdminPolicies = lazy(() => import("./pages/admin/AdminPolicies"));
const AdminEmployees = lazy(() => import("./pages/admin/AdminEmployees"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets"));
const AdminConversations = lazy(() => import("./pages/admin/AdminConversations"));
const AdminRestoreRequests = lazy(() => import("./pages/admin/AdminRestoreRequests"));

function AdminFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-paper">
      <Loader2 className="h-5 w-5 animate-spin text-moss-500" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConversationsProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-record"
              element={
                <ProtectedRoute>
                  <MyRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/archived"
              element={
                <ProtectedRoute>
                  <ArchivedChats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/policies"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminPolicies />
                    </Suspense>
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminEmployees />
                    </Suspense>
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tickets"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminTickets />
                    </Suspense>
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/conversations"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminConversations />
                    </Suspense>
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/restore-requests"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminRestoreRequests />
                    </Suspense>
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ConversationsProvider>
    </AuthProvider>
  );
}
