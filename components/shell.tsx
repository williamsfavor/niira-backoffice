import { SidebarNav } from "./sidebar-nav";

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="shell"><aside><div className="brand"><span>NIRA</span><small>CONTROL CENTRE</small></div><SidebarNav/><div className="admin"><div className="avatar">TS</div><div><strong>Tusiime Sam</strong><small>Super admin</small></div></div></aside><main><header><div><p className="eyebrow">NIRA WHATSAPP OPERATIONS</p><h1>Control centre</h1></div><div className="live"><i/> System operational</div></header>{children}</main></div>;
}
