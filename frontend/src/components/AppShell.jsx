import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Wallet,
  LifeBuoy,
  FileStack,
  Users,
  LogOut,
  Menu,
  X,
  Plus,
  Archive,
  Trash2,
  Settings as SettingsIcon,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationsContext";
import clsx from "../utils/clsx";
import { UserAvatar } from "./Avatar";

const primaryNav = [
  { to: "/chat", label: "Assistant", icon: MessageSquare, end: false },
  { to: "/my-record", label: "My HR record", icon: Wallet },
  { to: "/tickets", label: "HR tickets", icon: LifeBuoy },
  { to: "/archived", label: "Archived chats", icon: Archive },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const adminNav = [
  { to: "/admin/policies", label: "Policy documents", icon: FileStack },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/tickets", label: "HR ticket queue", icon: LifeBuoy },
  { to: "/admin/conversations", label: "Conversations & pipeline", icon: MessageSquare },
  { to: "/admin/restore-requests", label: "Restore requests", icon: Inbox },
];

function NavItem({ to, label, icon: Icon, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-white/10 text-paper"
            : "text-paper/60 hover:bg-white/5 hover:text-paper/90"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active-state accent bar — a small, confident indicator rather
              than relying on background tint alone to signal "you are here". */}
          <span
            className={clsx(
              "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-moss-400 transition-all duration-200",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon
            className={clsx(
              "h-4 w-4 transition-colors duration-150",
              isActive ? "text-moss-400" : "text-paper/40 group-hover:text-paper/70"
            )}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { email, isAdmin, logout } = useAuth();
  const { conversations, archiveConversation } = useConversations();
  const navigate = useNavigate();

  const handleArchive = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Move this conversation to Archived chats? You can request it back from HR later.")) return;
    try {
      await archiveConversation(id);
      toast.success("Moved to Archived chats");
    } catch (err) {
      toast.error(err.message || "Couldn't archive conversation");
    }
  };

  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moss-500 shadow-[0_0_0_4px_rgba(47,111,94,0.15)]">
          <FileStack className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-display text-[15px] font-medium leading-tight text-paper">HR Assistant</p>
          <p className="text-[11px] text-paper/40">Enterprise self-service</p>
        </div>
      </div>

      <button
        onClick={() => {
          navigate("/chat");
          onNavigate?.();
        }}
        className="mx-4 mb-5 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-paper/90 transition-all duration-150 hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        New conversation
      </button>

      {/*
        Everything between the header and the footer lives inside ONE
        scrollable region (min-h-0 is load-bearing here — without it, a
        flex-1 child won't actually shrink below its own content height,
        so this whole area would silently overflow past the sidebar and
        get clipped by the outer overflow-hidden wrapper, taking the
        admin nav and logout button with it). Primary nav, recent
        conversations, and admin nav now all scroll together as one unit,
        and the footer/logout stays pinned and always reachable below it.
      */}
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <nav className="flex flex-col gap-1">
          {/* "My HR record" and "HR tickets" are the employee's own
              self-service links. Admins already have the full "HR ticket
              queue" under the Admin section below, so these two are hidden
              for admin accounts to avoid duplicate/irrelevant nav items. */}
          {primaryNav
            .filter((item) => !isAdmin || (item.to !== "/my-record" && item.to !== "/tickets"))
            .map((item) => (
              <NavItem key={item.to} {...item} onClick={onNavigate} />
            ))}
        </nav>

        {conversations.length > 0 && (
          <div className="mt-6">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-paper/30">Recent</p>
            <div className="flex flex-col gap-0.5">
              {conversations.slice(0, 12).map((c) => (
                <NavLink
                  key={c.id}
                  to={`/chat/${c.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      "group flex items-center justify-between truncate rounded-lg px-3 py-2 text-[13px] transition-colors duration-150",
                      isActive ? "bg-white/10 text-paper/90" : "text-paper/45 hover:bg-white/5 hover:text-paper/80"
                    )
                  }
                >
                  <span className="truncate">{c.title}</span>
                  <button
                    onClick={(e) => handleArchive(e, c.id)}
                    title="Archive this conversation"
                    className="ml-2 shrink-0 rounded p-1 text-paper/30 opacity-0 transition-opacity hover:bg-white/10 hover:text-paper/80 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-6">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-paper/30">Admin</p>
            <nav className="flex flex-col gap-1">
              {adminNav.map((item) => (
                <NavItem key={item.to} {...item} onClick={onNavigate} />
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <UserAvatar email={email} className="ring-2 ring-white/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-paper/90">{email || "Employee"}</p>
            <p className="text-[11px] text-paper/40">{isAdmin ? "Admin access" : "Employee"}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg p-2 text-paper/40 transition-colors duration-150 hover:bg-white/5 hover:text-paper/90"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-moss-500">
            <FileStack className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display text-sm font-medium">HR Assistant</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-ink hover:bg-paper-dim"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/50 animate-fadeIn" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[80%] max-w-[300px] animate-riseIn">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-paper hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden pt-14 animate-fadeUp md:pt-0">{children}</main>
    </div>
  );
}