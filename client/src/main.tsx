/**
 * AI Workflow Platform - Frontend Entry Point
 * Updated: 2026-01-03 | Full React Frontend Build
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
