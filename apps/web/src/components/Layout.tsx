import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../hooks/useAuthStore";
import { th } from "../i18n/th";

const navItems = [
  { path: "/import", label: th.importData, icon: "📥" },
  { path: "/requests", label: th.specialRequests, icon: "📝" },
  { path: "/scheduler", label: th.scheduler, icon: "⚙️" },
  { path: "/timetable", label: th.timetable, icon: "📅" },
  { path: "/ai-results", label: th.aiResults, icon: "🤖" },
  { path: "/summary", label: th.summaryExport, icon: "📊" },
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
        <aside className="sl-rail" aria-label="เมนูหลัก">
          <div className="sl-rail__brand">
            <span className="sl-rail__mark" aria-hidden="true">S</span>
            <div>
              <strong>{th.appName.toUpperCase()}</strong>
              <small>{th.railDescription}</small>
            </div>
          </div>
          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sl-rail__link ${isActive ? "is-active" : ""}`
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="sl-btn sl-btn--ghost"
            style={{ marginTop: "auto", width: "100%", justifyContent: "flex-start" }}
            onClick={handleLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {th.logout}
          </button>
        </aside>
        <main className="sl-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}