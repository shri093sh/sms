import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

export default function AppLayout() {
  // Sidebar is a fixed column on desktop; below the 860px breakpoint
  // (theme.css) it becomes an off-canvas drawer controlled from here.
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      {drawerOpen && (
        <div className="app-sidebar-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar onMenuClick={() => setDrawerOpen((v) => !v)} />
        <main className="app-main" style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
