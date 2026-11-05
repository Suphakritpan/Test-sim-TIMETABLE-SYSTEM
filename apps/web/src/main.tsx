import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";
import "./styles/tokens.css";
import "./styles/components.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("E-WEB-001: ไม่พบ root element");
}

createRoot(root).render(
  <StrictMode>
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  </StrictMode>
);