"use client";

import Link from "next/link";
import { BarChart3, Building2, CalendarDays, CircleHelp, FileSearch, LayoutDashboard, Settings, Ticket } from "lucide-react";
import { usePathname } from "next/navigation";

const navigation = [
  {
    label: "Operations",
    links: [
      ["Dashboard", "/", LayoutDashboard],
      ["Applications", "/applications", FileSearch],
      ["Collection centres", "/centers", Building2],
      ["Appointments", "/appointments", CalendarDays],
      ["Support tickets", "/tickets", Ticket],
      ["Reports", "/reports", BarChart3],
    ],
  },
  {
    label: "Management",
    links: [
      ["FAQs & content", "/faqs", CircleHelp],
      ["Settings", "/settings", Settings],
    ],
  },
] as const;

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {navigation.map((section) => (
        <div className="nav-section" key={section.label}>
          {!collapsed && <p>{section.label}</p>}
          {collapsed && <span className="nav-divider" />}
          <div>
            {section.links.map(([label, href, Icon]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link className={active ? "active" : ""} href={href} key={label} onClick={onNavigate} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined}>
                  <Icon size={19} strokeWidth={1.8} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
