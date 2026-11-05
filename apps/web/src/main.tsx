import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import { useMotionPreset } from "./motion/useMotionPreset";
import { th } from "./i18n/th";
import "./styles/tokens.css";
import "./styles/components.css";

type ViewState = "loading" | "empty" | "error" | "success";

function getInitialViewState(): ViewState {
  return "empty";
}

function App() {
  const motion = useMotionPreset();
  const state = getInitialViewState();

  return (
    <main className="sl-ground sl-enter" aria-live="polite" style={motion.animate}>
      <div className="sl-shell">
      <aside className="sl-rail">
        <div className="sl-rail__brand">
          <span className="sl-rail__mark" aria-hidden="true">S</span>
          <div>
            <strong>{th.appName.toUpperCase()}</strong>
            <small>{th.railDescription}</small>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">
          <a href="#overview" aria-current="page">{th.overview}</a>
          <a href="#import">{th.importData}</a>
          <a href="#runs">{th.runs}</a>
        </nav>
      </aside>
      <section className="sl-main">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.appDescription}</h1>
            <p>{th.verificationRequired}</p>
          </div>
          <span className="sl-badge sl-badge--warn" role="status">{th.waitingForImport}</span>
        </header>
        {state === "loading" && <section className="sl-card"><p>{th.loading}</p></section>}
        {state === "error" && <section className="sl-card"><h2>{th.errorTitle}</h2><p className="sl-help">{th.apiUnavailable}</p></section>}
        {state === "success" && <section className="sl-card"><h2>{th.successTitle}</h2></section>}
        {state === "empty" && (
          <section className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">+</div>
            <h2>{th.noDataTitle}</h2>
            <p className="sl-help">{th.noDataDescription}</p>
            <a className="sl-btn sl-btn--pri" href="#import">{th.importAction}</a>
          </section>
        )}
      </section>
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("E-WEB-001: ไม่พบ root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
