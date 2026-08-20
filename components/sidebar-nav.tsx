"use client";

import Link from "next/link";
import { Building2, CalendarDays, CircleHelp, FileSearch, LayoutDashboard, Settings, Ticket } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [["Dashboard", "/", LayoutDashboard], ["Applications", "/applications", FileSearch], ["Collection centres", "/centers", Building2], ["FAQs & content", "/faqs", CircleHelp], ["Tickets", "/tickets", Ticket], ["Appointments", "/appointments", CalendarDays], ["Settings", "/settings", Settings]] as const;

export function SidebarNav() {
  const pathname = usePathname();
  return <nav>{links.map(([label, href, Icon]) => <Link className={(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "active" : ""} href={href} key={label}><Icon size={18}/>{label}</Link>)}</nav>;
}
