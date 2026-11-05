import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FileUp, FileText, CalendarCog, CalendarDays, Bot, FileSpreadsheet, LogOut } from "lucide-react";
import { useAuthStore } from "../hooks/useAuthStore";
import { th } from "../i18n/th";

const navItems = [
  { path: "/import", label: th.importData, icon: FileUp },
  { path: "/requests", label: th.specialRequests, icon: FileText },
  { path: "/scheduler", label: th.scheduler, icon: CalendarCog },
  { path: "/timetable", label: th.timetable, icon: CalendarDays },
  { path: "/ai-results", label: th.aiResults, icon: Bot },
  { path: "/summary", label: th.summaryExport, icon: FileSpreadsheet },
] as const;

export function Layout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sl-ground">
      <div className="sl-shell">
        <aside className="sl-rail" aria-label="เมนูหลัก" style={{ position: "sticky", top: "16px", height: "calc(100dvh - 32px)", marginBottom: "16px" }}>
          <div className="sl-rail__brand">
            <span className="sl-rail__mark" aria-hidden="true">S</span>
            <div>
              <strong>{th.appName.toUpperCase()}</strong>
              <small>{th.railDescription}</small>
            </div>
          </div>
          <nav>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sl-rail__link ${isActive ? "is-active" : ""}`
                  }
                >
                  <span style={{ width: "24px", display: "inline-flex", justifyContent: "center" }} aria-hidden="true">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div style={{ borderTop: "var(--border-hair) solid var(--line)", paddingTop: "var(--space-3)", marginTop: "auto" }}>
            <button
              className="sl-btn sl-btn--ghost"
              style={{ 
                width: "100%", 
                justifyContent: "flex-start", 
                color: "var(--side-ink-2)" 
              }}
              onClick={handleLogout}
            >
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
              {th.logout}
            </button>
          </div>
        </aside>
        <main className="sl-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}