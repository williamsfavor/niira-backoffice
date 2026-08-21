import { redirect } from "next/navigation";
export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/tickets?ticket=${encodeURIComponent(id)}`); }
