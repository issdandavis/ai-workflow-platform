/**
 * AI Workflow Platform - Main App Component
 */

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ChatPage } from "./pages/ChatPage";
import { FleetPage } from "./pages/FleetPage";
import { RoundtablePage } from "./pages/RoundtablePage";
import { SettingsPage } from "./pages/SettingsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";

type Page = "dashboard" | "projects" | "chat" | "fleet" | "roundtable" | "settings" | "integrations";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard />;
      case "projects": return <ProjectsPage />;
      case "chat": return <ChatPage />;
      case "fleet": return <FleetPage />;
      case "roundtable": return <RoundtablePage />;
      case "settings": return <SettingsPage />;
      case "integrations": return <IntegrationsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header currentPage={currentPage} />
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
      <style>{`
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .app-layout {
          display: flex;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
          margin-left: 260px;
          transition: margin-left 0.3s;
        }
        .main-content.sidebar-collapsed {
          margin-left: 72px;
        }
        .page-content {
          padding: 1.5rem;
          min-height: calc(100vh - 65px);
        }
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
