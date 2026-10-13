import "server-only";
import { adminSupabase } from "./admin-supabase";
import { normalizeListParams, paginationRange, type ListParams, type PaginatedResult } from "./list";
import { parseStages } from "./operations-types";
import type { AdminRole } from "./permissions";

export type ApplicationParams = ListParams & { status?: string; type?: string; stage?: string };
export type ApplicationRow = { application_id: string; applicant_name: string | null; phone_number: string | null; application_type: string | null; status: string; current_stage: string | null; last_update: string | null };

function maskName(name: string | null, role: AdminRole) {
  if (!name || role === "super_admin") return name;
  const [first, ...rest] = name.split(/\s+/);
  return `${first}${rest[0] ? ` ${rest[0][0]}.` : ""}`;
}

export async function getApplications(params: ApplicationParams, role: AdminRole): Promise<PaginatedResult<ApplicationRow> & { filters: ReturnType<typeof normalizeApplicationParams> }> {
  const filters = normalizeApplicationParams(params);
  const client = adminSupabase();
  const load = async (page: number) => {
    let query = client.from("applications").select("application_id,applicant_name,phone_number,application_type,status,current_stage,last_update", { count: "exact" });
    if (filters.q) query = query.or(`application_id.ilike.%${filters.q}%,applicant_name.ilike.%${filters.q}%,phone_number.ilike.%${filters.q}%`);
    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.type !== "all") query = query.eq("application_type", filters.type);
    if (filters.stage !== "all") query = query.eq("current_stage", filters.stage);
    const range = paginationRange(page, filters.pageSize);
    return query.order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to);
  };
  let result = await load(filters.page);
  if (result.error) throw new Error(`Unable to load applications: ${result.error.message}`);
  const total = result.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  if (filters.page > pageCount) { filters.page = pageCount; result = await load(pageCount); }
  return { rows: (result.data ?? []).map((row) => ({ ...row, applicant_name: maskName(row.applicant_name, role) })), total, page: filters.page, pageSize: filters.pageSize, pageCount, filters };
}

function normalizeApplicationParams(params: ApplicationParams) {
  const base = normalizeListParams(params, ["last_update", "application_id", "status", "application_type"], "last_update");
  return { ...base, status: params.status || "all", type: params.type || "all", stage: params.stage || "all" };
}

export async function getApplicationFilterOptions() {
  const { data, error } = await adminSupabase().from("applications").select("status,application_type,current_stage").limit(2000);
  if (error) throw new Error(error.message);
  const unique = (key: "status" | "application_type" | "current_stage") => [...new Set((data ?? []).map((row) => row[key]).filter(Boolean) as string[])].sort();
  return { statuses: unique("status"), types: unique("application_type"), stages: unique("current_stage") };
}

export async function getApplicationDetail(id: string, role: AdminRole) {
  const { data, error } = await adminSupabase().from("applications").select("*,assigned_center:centers!applications_assigned_center_id_fkey(id,name,district,address)").eq("application_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const center = Array.isArray(data.assigned_center) ? data.assigned_center[0] ?? null : data.assigned_center;
  return { ...data, applicant_name: maskName(data.applicant_name, role), assigned_center: center, stages: parseStages(data.stages, data.current_stage) };
}
