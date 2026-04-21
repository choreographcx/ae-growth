import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapBranding } from "./lib/branding";

// Apply cached branding synchronously (cheap localStorage read inside
// bootstrapBranding) so the first paint already has the right colors,
// then mount React immediately. We do NOT hide the document while waiting
// for the network — that pattern breaks the Lovable preview iframe (and
// any environment that snapshots the page before async work finishes).
// Remote branding is fetched in the background and re-applied when ready.
void bootstrapBranding();

createRoot(document.getElementById("root")!).render(<App />);
