import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { th } from "./i18n/th";
import "./styles.css";

function App() {
  return (
    <main className="container">
      <header>
        <p className="eyebrow">{th.appName.toUpperCase()}</p>
        <h1>{th.appDescription}</h1>
        <p className="subtitle">{th.verificationRequired}</p>
      </header>
      <section className="card empty-state" aria-live="polite">
        <p className="eyebrow">NO VERIFIED DATA</p>
        <h2>{th.emptyTitle}</h2>
        <p>{th.emptyDescription}</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
