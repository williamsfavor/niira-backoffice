import { RecordDetail } from "@/components/record-detail";
import { getRecord } from "@/lib/supabase";
export default async function AppointmentDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail title={`Appointment ${id}`} back="/appointments" record={await getRecord("appointments", "appointment_id", id) as Record<string, unknown> | null}/>; }
