import { RecordDetail } from "@/components/record-detail";
import { getRecord } from "@/lib/supabase";
export default async function CenterDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail title="Collection centre" back="/centers" record={await getRecord("centers", "id", id) as Record<string, unknown> | null}/>; }
