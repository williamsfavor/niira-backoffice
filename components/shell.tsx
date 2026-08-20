import Link from "next/link";
import { BarChart3, Building2, CalendarDays, CircleHelp, FileSearch, LayoutDashboard, Settings, Ticket } from "lucide-react";

const links = [
  ["Dashboard", "/", LayoutDashboard], ["Applications", "/applications", FileSearch], ["Collection centres", "/centers", Building2],
  ["FAQs & content", "/faqs", CircleHelp], ["Tickets", "/tickets", Ticket], ["Appointments", "/appointments", CalendarDays], ["Analytics", "/#analytics", BarChart3], ["Settings", "/settings", Settings]
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="shell"><aside><div className="brand"><span>NIRA</span><small>CONTROL CENTRE</small></div><nav>{links.map(([label, href, Icon]) => <Link href={href} key={label}><Icon size={18}/>{label}</Link>)}</nav><div className="admin"><div className="avatar">TS</div><div><strong>Tusiime Sam</strong><small>Super admin</small></div></div></aside><main><header><div><p className="eyebrow">NIRA WHATSAPP OPERATIONS</p><h1>Control centre</h1></div><div className="live"><i/> System operational</div></header>{children}</main></div>;
}
