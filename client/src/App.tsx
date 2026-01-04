/**
 * AI Workflow Platform - Main App Component
 */

import React, { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MobileSidebar } from "./components/layout/MobileSidebar";
import { ToastContainer } from "./components/ui/Toast";
import { SkipLink } from "./components/ui/SkipLink";
import { LoginPage } from "./pages/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ChatPage } from "./pages/ChatPage";
import { FleetPage } from "./pages/FleetPage";
import { RoundtablePage } from "./pages/RoundtablePage";
import { SettingsPage } from "./pages/SettingsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { ShopifyPage } from "./pages/ShopifyPage";

export type Page = "dashboard" | "projects" | "chat" | "fleet" | "roundtable" | "settings" | "integrations" | "shopify";

export interface NavigateOptions {
  openModal?: "create" | "detail";
  id?: string;
}

export type NavigateFn = (page: Page, options?: NavigateOptions) => void;

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingModal, setPendingModal] = useState<NavigateOptions | null>(null);

  const navigate: NavigateFn = useCallback((page: Page, options?: NavigateOptions) => {
    setCurrentPage(page);
    if (options) {
      setPendingModal(options);
    }
  }, []);

  const clearPendingModal = useCallback(() => {
    setPendingModal(null);
  }, []);

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
      case "dashboard": return <Dashboard onNavigate={navigate} />;
      case "projects": return <ProjectsPage onNavigate={navigate} pendingModal={pendingModal} onModalHandled={clearPendingModal} />;
      case "chat": return <ChatPage />;
      case "fleet": return <FleetPage onNavigate={navigate} pendingModal={pendingModal} onModalHandled={clearPendingModal} />;
      case "roundtable": return <RoundtablePage onNavigate={navigate} pendingModal={pendingModal} onModalHandled={clearPendingModal} />;
      case "settings": return <SettingsPage />;
      case "integrations": return <IntegrationsPage />;
      case "shopify": return <ShopifyPage />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      <SkipLink targetId="main-content" />
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={(page) => navigate(page)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={(page) => navigate(page)}
      />
      <main className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header 
          currentPage={currentPage} 
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
        />
        <div id="main-content" className="page-content" tabIndex={-1}>
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
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
