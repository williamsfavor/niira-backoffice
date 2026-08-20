import { RecordDetail } from "@/components/record-detail";
import { getRecord } from "@/lib/supabase";
export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail title={`Application ${id}`} back="/applications" record={await getRecord("applications", "application_id", id) as Record<string, unknown> | null}/>; }
