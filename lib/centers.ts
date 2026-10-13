import "server-only";
import { adminSupabase } from "./admin-supabase";
import { loadClampedPage, normalizeListParams, paginationRange, type ListParams, type PaginatedResult } from "./list";
import { parseWeeklyHours, type WeeklyHours } from "./operations-types";

export type CenterParams = ListParams & { district?: string; status?: string; service?: string; openAt?: string };
export type CenterRow = { id: string; name: string; district: string; address: string; phone: string | null; email: string | null; hours: string | null; weekly_hours: WeeklyHours; coordinates: { type: "Point"; coordinates: [number, number] } | null; is_active: boolean; center_services: Array<{ services: { id: string; name: string; is_active: boolean } | null }> };

const firstRelation = <T>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export async function getCenters(params: CenterParams = {}): Promise<PaginatedResult<CenterRow> & { filters: ReturnType<typeof normalizeCenterParams> }> {
  const filters = normalizeCenterParams(params);
  const client = adminSupabase();
  let ids: string[] | null = null;
  let totalFromRpc: number | null = null;
  if (filters.openAt) {
    const rpcPage = (page: number, limit = filters.pageSize) => { const range = paginationRange(page, filters.pageSize); return client.rpc("search_center_ids", { p_query: filters.q || null, p_district: filters.district === "all" ? null : filters.district, p_status: filters.status === "all" ? null : filters.status, p_service_id: filters.service === "all" ? null : filters.service, p_open_at: new Date(filters.openAt).toISOString(), p_sort: filters.sort, p_direction: filters.direction, p_offset: range.from, p_limit: limit }); };
    let { data, error } = await rpcPage(filters.page);
    if (error) throw new Error(`Unable to filter centre availability: ${error.message}`);
    if (!data?.length && filters.page > 1) {
      const first = await rpcPage(1, 1);
      if (first.error) throw new Error(`Unable to filter centre availability: ${first.error.message}`);
      const total = Number(first.data?.[0]?.total_count ?? 0);
      filters.page = Math.max(1, Math.ceil(total / filters.pageSize));
      const finalPage = await rpcPage(filters.page); data = finalPage.data; error = finalPage.error;
      if (error) throw new Error(`Unable to filter centre availability: ${error.message}`);
      totalFromRpc = total;
    }
    ids = (data ?? []).map((row: { id: string }) => row.id);
    totalFromRpc ??= Number(data?.[0]?.total_count ?? 0);
  }
  const servicesRelation = filters.service === "all" ? "center_services(services(id,name,is_active))" : "center_services!inner(service_id,services(id,name,is_active))";
  const build = () => { let query = client.from("centers").select(`id,name,district,address,phone,email,hours,weekly_hours,coordinates,is_active,${servicesRelation}`, { count: "exact" }); if (filters.q) query = query.or(`name.ilike.%${filters.q}%,address.ilike.%${filters.q}%`); if (filters.district !== "all") query = query.eq("district", filters.district); if (filters.status !== "all") query = query.eq("is_active", filters.status === "active"); if (filters.service !== "all") query = query.eq("center_services.service_id", filters.service); return query; };
  let data, error, total: number, pageCount: number;
  if (ids) {
    let query = client.from("centers").select(`id,name,district,address,phone,email,hours,weekly_hours,coordinates,is_active,${servicesRelation}`); query = ids.length ? query.in("id", ids) : query.eq("id", "00000000-0000-0000-0000-000000000000"); const response = await query.order(filters.sort, { ascending: filters.direction === "asc" }); data = response.data; error = response.error; total = totalFromRpc ?? 0; pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  } else {
    const response = await loadClampedPage(filters.page, filters.pageSize, async (page) => { const range = paginationRange(page, filters.pageSize); return await build().order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to); }); data = response.data; error = response.error; total = response.total; pageCount = response.pageCount; filters.page = response.page;
  }
  if (error) throw new Error(`Unable to load centres: ${error.message}`);
  const order = new Map((ids ?? []).map((id, index) => [id, index]));
  const rows = (data ?? []).map((row) => ({
    ...row,
    weekly_hours: parseWeeklyHours(row.weekly_hours),
    center_services: (row.center_services ?? []).map((link) => ({ services: firstRelation(link.services) })),
  })) as CenterRow[];
  if (ids) rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { rows, total, page: filters.page, pageSize: filters.pageSize, pageCount, filters };
}

function normalizeCenterParams(params: CenterParams) {
  return { ...normalizeListParams(params, ["name", "district", "created_at"], "name"), district: params.district || "all", status: params.status || "all", service: params.service || "all", openAt: params.openAt && !Number.isNaN(new Date(params.openAt).getTime()) ? params.openAt : "" };
}

export async function getCenterFilterOptions() {
  const { data, error } = await adminSupabase().from("centers").select("district").order("district");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.district))];
}

export async function getCenterDetail(id: string) {
  const { data, error } = await adminSupabase().from("centers").select("*,center_services(services(id,name,description,is_active))").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? {
    ...data,
    weekly_hours: parseWeeklyHours(data.weekly_hours),
    center_services: (data.center_services ?? []).map((link: { services: unknown[] | unknown | null }) => ({ services: firstRelation(link.services) })),
  } : null;
}

export async function getCenterOptions(activeOnly = true) {
  let query = adminSupabase().from("centers").select("id,name,district,is_active").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
