import { RecordDetail } from "@/components/record-detail";
import { getRecord } from "@/lib/supabase";
export default async function FaqDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail title="FAQ" back="/faqs" record={await getRecord("faqs", "id", id) as Record<string, unknown> | null}/>; }
