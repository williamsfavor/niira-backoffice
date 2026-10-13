import { Shell } from "@/components/shell";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { const admin = await requireBackofficeAdmin(); return <Shell admin={admin}>{children}</Shell>; }
