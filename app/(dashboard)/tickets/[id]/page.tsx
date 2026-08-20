import { RecordDetail } from "@/components/record-detail";
import { getRecord } from "@/lib/supabase";
export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail title={`Ticket ${id}`} back="/tickets" record={await getRecord("tickets", "ticket_id", id) as Record<string, unknown> | null}/>; }
