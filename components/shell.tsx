"use client";

import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-head">
          <a className="brand" href="/" aria-label="NIRA dashboard">
            <span className="brand-mark">N</span>
            {!collapsed && <span className="brand-copy"><strong>NIRA</strong><small>Control centre</small></span>}
          </a>
          <button className="icon-button desktop-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <SidebarNav collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        {!collapsed && <div className="sidebar-help"><span>System status</span><strong><i /> WhatsApp operational</strong><small>Messages and database connected</small></div>}
      </aside>

      <div className="workspace">
        <div className="workspace-card">
          <header className="topbar">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <label className="global-search"><Search size={18} /><input aria-label="Search dashboard" placeholder="Search dashboard" /></label>
            <div className="topbar-actions">
              <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button>
              <div className="profile-copy"><strong>Tusiime Sam</strong><small>Super admin</small></div>
              <div className="avatar">TS</div>
            </div>
          </header>
          <main id="main-content" className="content-scroll"><div className="content-container">{children}</div></main>
        </div>
      </div>
    </div>
  );
}
