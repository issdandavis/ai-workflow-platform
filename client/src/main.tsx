/**
 * Frontend Entry Point
 *
 * This is a placeholder. A full React application needs to be built here.
 */

import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>AI Workflow Platform</h1>
      <p>Frontend placeholder - build your React app here</p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
