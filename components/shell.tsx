"use client";

import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import type { CurrentAdmin } from "@/lib/backoffice-auth";
import { roleLabel } from "@/lib/permissions";

export function Shell({ children, admin }: { children: React.ReactNode; admin: CurrentAdmin }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-head">
          <Link className="brand" href="/" aria-label="NIRA dashboard">
            <Image className="brand-logo" src="/niira-logo.jpg" alt="" width={34} height={34} priority />
            {!collapsed && <span className="brand-copy"><strong>NIRA</strong><small>Control centre</small></span>}
          </Link>
          <button className="icon-button desktop-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <SidebarNav collapsed={collapsed} onNavigate={() => setMobileOpen(false)} permissions={admin.permissions} />
        {!collapsed && <div className="sidebar-help"><span>System status</span><strong><i /> WhatsApp operational</strong><small>Messages and database connected</small></div>}
      </aside>

      <div className="workspace">
        <div className="workspace-card">
          <header className="topbar">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <form className="global-search" action="/applications"><Search size={18} /><input name="q" aria-label="Search applications" placeholder="Search applications" /></form>
            <div className="topbar-actions">
              <Link className="icon-button notification-button" href="/tickets" aria-label="Open support tickets"><Bell size={19} /><span /></Link>
              <Link className="profile-link" href="/settings" aria-label="Open account settings"><div className="profile-copy"><strong>{admin.name}</strong><small>{roleLabel(admin.role)}</small></div><div className="avatar">{admin.initials}</div></Link>
            </div>
          </header>
          <main id="main-content" className="content-scroll"><div className="content-container">{children}</div></main>
        </div>
      </div>
    </div>
  );
}
