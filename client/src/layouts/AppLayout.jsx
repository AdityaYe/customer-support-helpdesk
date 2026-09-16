import {
  ChevronDown,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import NotificationBell from "../components/NotificationBell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const roleLabels = {
  customer: "Customer",
  agent: "Support Agent",
  manager: "Manager",
  admin: "Administrator",
};

function getDashboardPath(role) {
  switch (role) {
    case "customer":
      return "/customer";
    case "agent":
      return "/agent";
    case "manager":
      return "/manager";
    case "admin":
      return "/admin";
    default:
      return "/help";
  }
}

function navLinkClass({ isActive }) {
  return [
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  ].join(" ");
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileHovered, setProfileHovered] = useState(false);

  const profileRef = useRef(null);

  const isAuthenticated = Boolean(user);
  const isCustomer = user?.role === "customer";
  const isSupportUser = ["agent", "manager", "admin"].includes(user?.role);

  const dashboardPath = getDashboardPath(user?.role);

  useEffect(() => {
    if (!profileOpen) return;

    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
        setProfileHovered(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setProfileHovered(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setProfileHovered(false);
    setMobileOpen(false);

    await logout();
    navigate("/help", { replace: true });
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const closeMenus = () => {
    setMobileOpen(false);
    setProfileOpen(false);
    setProfileHovered(false);
  };

  return (
    <div
      className={`bg-[#f4f6f8] text-slate-900 ${
        location.pathname === "/help"
          ? "h-screen overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              to="/help"
              onClick={closeMenus}
              className="flex shrink-0 items-center gap-2.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
                <Headphones className="h-4 w-4" />
              </span>

              <span className="hidden text-sm font-semibold text-slate-900 sm:block">
                Helpdesk
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                {isCustomer && (
                  <NavLink
                    to={dashboardPath}
                    className={({ isActive }) =>
                      [
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                      ].join(" ")
                    }
                  >
                    <Ticket className="h-4 w-4" />
                    My tickets
                  </NavLink>
                )}

                {isSupportUser && (
                  <NavLink to={dashboardPath} className={navLinkClass}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </NavLink>
                )}

                <NotificationBell />

                <div
                  ref={profileRef}
                  className="relative"
                  onMouseEnter={() => {
                    if (!profileOpen) {
                      setProfileHovered(true);
                    }
                  }}
                  onMouseLeave={() => {
                    setProfileHovered(false);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((value) => !value);
                      setProfileHovered(false);
                    }}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    className={[
                      "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                      profileOpen
                        ? "border-brand-200 bg-brand-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>

                    <span className="hidden max-w-[120px] sm:block">
                      <span className="block truncate text-xs font-semibold leading-tight text-slate-900">
                        {user.name}
                      </span>

                      <span className="block text-[11px] leading-tight text-slate-500">
                        {roleLabels[user.role] || user.role}
                      </span>
                    </span>

                    <ChevronDown
                      className={[
                        "h-3.5 w-3.5 text-slate-400 transition-transform",
                        profileOpen ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>

                  {profileHovered && !profileOpen && (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-dropdown">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user.email}
                      </p>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Account type
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                          {roleLabels[user.role] || user.role}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-dropdown"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationBell />}

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              {mobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <nav className="space-y-0.5">
              {isAuthenticated ? (
                <>
                  {isCustomer && (
                    <Link
                      to={dashboardPath}
                      onClick={closeMobile}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Ticket className="h-4 w-4 text-slate-400" />
                      My tickets
                    </Link>
                  )}

                  {isSupportUser && (
                    <>
                      <Link
                        to={dashboardPath}
                        onClick={closeMobile}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <LayoutDashboard className="h-4 w-4 text-slate-400" />
                        Dashboard
                      </Link>
                    </>
                  )}

                  {isCustomer && (
                    <Link
                      to="/help"
                      onClick={closeMobile}
                      className="mt-1 flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      Get support
                    </Link>
                  )}

                  <div className="my-2 border-t border-slate-100" />

                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {roleLabels[user.role] || user.role}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobile}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMobile}
                    className="flex-1 rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main
        className={`min-h-0 pb-[55px] ${
          location.pathname === "/help"
            ? "h-[calc(100vh-64px)] overflow-hidden"
            : ""
        }`}
      >
        <Outlet />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-700 text-white">
              <Headphones className="h-3.5 w-3.5" />
            </span>

            <span className="text-xs text-slate-500">
              Helpdesk Support Portal
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Tickets · Knowledge base · Support workflows
          </span>
        </div>
      </footer>
    </div>
  );
}
