import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapBranding } from "./lib/branding";

// Hide the body until branding (colors, favicon, title) has been loaded
// so unauthenticated/incognito visitors never see a flash of default theme.
if (typeof document !== "undefined") {
  document.documentElement.style.visibility = "hidden";
}

const reveal = () => {
  if (typeof document !== "undefined") {
    document.documentElement.style.visibility = "";
  }
};

bootstrapBranding().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
  // Reveal on next frame so the first paint already has the right theme.
  requestAnimationFrame(reveal);
});
