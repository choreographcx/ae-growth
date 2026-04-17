import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapBranding } from "./lib/branding";

// Apply cached branding (colors, favicon, sidebar style) before React renders
// so login/loading screens already match the configured theme.
bootstrapBranding();

createRoot(document.getElementById("root")!).render(<App />);
