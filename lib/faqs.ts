import "server-only";
import { adminSupabase } from "./admin-supabase";
import { loadClampedPage, normalizeListParams, paginationRange, type ListParams, type PaginatedResult } from "./list";

export type FaqParams = ListParams & { category?: string; status?: string };
export type FaqRow = { id: string; category: string; question: string; answer: string; keywords: string[]; priority: number; related_faq_ids: string[]; view_count: number; is_active: boolean; updated_at: string };

export async function getFaqs(params: FaqParams = {}): Promise<PaginatedResult<FaqRow> & { filters: ReturnType<typeof normalizeFaqParams> }> {
  const filters = normalizeFaqParams(params);
  const client = adminSupabase();
  const load = async (page: number) => { let query = client.from("faqs").select("id,category,question,answer,keywords,priority,related_faq_ids,view_count,is_active,updated_at", { count: "exact" }); if (filters.q) query = query.textSearch("search_vector", filters.q, { type: "websearch", config: "english" }); if (filters.category !== "all") query = query.eq("category", filters.category); if (filters.status !== "all") query = query.eq("is_active", filters.status === "active"); const range = paginationRange(page, filters.pageSize); return await query.order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to); };
  const { data, error, total, page, pageCount } = await loadClampedPage(filters.page, filters.pageSize, load);
  if (error) throw new Error(`Unable to load FAQs: ${error.message}`);
  filters.page = page;
  return { rows: data ?? [], total, page, pageSize: filters.pageSize, pageCount, filters };
}
function normalizeFaqParams(params: FaqParams) { return { ...normalizeListParams(params, ["priority", "view_count", "updated_at", "question"], "priority"), category: params.category || "all", status: params.status || "all" }; }

export async function getFaqDetail(id: string) {
  const client = adminSupabase();
  const { data, error } = await client.from("faqs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const related = data.related_faq_ids?.length ? await client.from("faqs").select("id,question,category,is_active").in("id", data.related_faq_ids) : { data: [], error: null };
  if (related.error) throw new Error(related.error.message);
  return { ...data, related: related.data ?? [] };
}

export async function getFaqOptions(excludeId?: string) {
  let query = adminSupabase().from("faqs").select("id,question,category,is_active").order("question");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
