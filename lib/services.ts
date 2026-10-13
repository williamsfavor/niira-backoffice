import "server-only";
import { adminSupabase } from "./admin-supabase";
import { loadClampedPage, normalizeListParams, paginationRange, type ListParams, type PaginatedResult } from "./list";

export type ServiceRow = { id: string; name: string; description: string | null; expected_duration_minutes: number | null; is_active: boolean; created_at: string; updated_at: string };
export type ServiceParams = ListParams & { status?: string };

export async function getServices(params: ServiceParams = {}): Promise<PaginatedResult<ServiceRow> & { filters: ReturnType<typeof normalizeServiceParams> }> {
  const filters = normalizeServiceParams(params);
  const client = adminSupabase();
  const load = async (page: number) => { let query = client.from("services").select("id,name,description,expected_duration_minutes,is_active,created_at,updated_at", { count: "exact" }); if (filters.q) query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`); if (filters.status !== "all") query = query.eq("is_active", filters.status === "active"); const range = paginationRange(page, filters.pageSize); return await query.order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to); };
  const { data, error, total, page, pageCount } = await loadClampedPage(filters.page, filters.pageSize, load);
  if (error) throw new Error(`Unable to load services: ${error.message}`);
  filters.page = page;
  return { rows: data ?? [], total, page, pageSize: filters.pageSize, pageCount, filters };
}

function normalizeServiceParams(params: ServiceParams) {
  return { ...normalizeListParams(params, ["name", "created_at", "updated_at"], "name"), status: params.status || "all" };
}

export async function getServiceOptions(activeOnly = true) {
  let query = adminSupabase().from("services").select("id,name,is_active").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
