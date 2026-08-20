import { Shell } from "@/components/shell";
import { requireBackofficeUser } from "@/lib/backoffice-auth";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { await requireBackofficeUser(); return <Shell>{children}</Shell>; }
