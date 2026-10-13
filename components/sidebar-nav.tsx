"use client";

import Link from "next/link";
import { BarChart3, Building2, CalendarDays, CircleHelp, FileSearch, LayoutDashboard, Settings, Ticket, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/permissions";

const navigation = [
  {
    label: "Operations",
    links: [
      ["Dashboard", "/", LayoutDashboard, null],
      ["Applications", "/applications", FileSearch, "applications:read"],
      ["Collection centres", "/centers", Building2, "centers:read"],
      ["Services", "/services", Wrench, "services:read"],
      ["Appointments", "/appointments", CalendarDays, "appointments:read"],
      ["Support tickets", "/tickets", Ticket, "tickets:read"],
      ["Reports", "/reports", BarChart3, "reports:read"],
    ],
  },
  {
    label: "Management",
    links: [
      ["FAQs & content", "/faqs", CircleHelp, "faqs:read"],
      ["Settings", "/settings", Settings, "settings:read"],
    ],
  },
] as const;

export function SidebarNav({ collapsed = false, onNavigate, permissions }: { collapsed?: boolean; onNavigate?: () => void; permissions: Permission[] }) {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {navigation.map((section) => (
        <div className="nav-section" key={section.label}>
          {!collapsed && <p>{section.label}</p>}
          {collapsed && <span className="nav-divider" />}
          <div>
            {section.links.filter(([, , , permission]) => !permission || permissions.includes(permission as Permission)).map(([label, href, Icon]) => {
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
