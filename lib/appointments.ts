import "server-only";
import { adminSupabase } from "./admin-supabase";
import { loadClampedPage, normalizeListParams, paginationRange, type ListParams, type PaginatedResult } from "./list";

export type AppointmentParams = ListParams & { status?: string; center?: string; service?: string; from?: string; to?: string };
export type SlotParams = ListParams & { status?: string; booking?: string; center?: string; from?: string; to?: string };
export type AppointmentRow = { id: string; appointment_id: string; customer_name: string | null; phone_number: string; status: string; service_type: string; source: string; created_at: string; centers: { id: string; name: string } | null; services: { id: string; name: string } | null; appointment_slots: { id: string; slot_reference: string; starts_at: string } | null };
export type SlotRow = { id: string; slot_reference: string; starts_at: string; is_active: boolean; centers: { id: string; name: string } | null; services: { id: string; name: string } | null; appointments: Array<{ appointment_id: string; status: string }> };

const first = <T>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export async function getAppointments(params: AppointmentParams = {}): Promise<PaginatedResult<AppointmentRow> & { filters: ReturnType<typeof normalizeAppointmentParams> }> {
  const filters = normalizeAppointmentParams(params);
  const client = adminSupabase();
  const load = async (page: number) => { let query = client.from("appointments").select("id,appointment_id,customer_name,phone_number,status,service_type,source,created_at,center_id,service_id,centers(id,name),services(id,name),appointment_slots!inner(id,slot_reference,starts_at)", { count: "exact" }); if (filters.q) query = query.or(`appointment_id.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,phone_number.ilike.%${filters.q}%`); if (filters.status !== "all") query = query.eq("status", filters.status); if (filters.center !== "all") query = query.eq("center_id", filters.center); if (filters.service !== "all") query = query.eq("service_id", filters.service); if (filters.from) query = query.gte("appointment_slots.starts_at", `${filters.from}T00:00:00+03:00`); if (filters.to) query = query.lte("appointment_slots.starts_at", `${filters.to}T23:59:59+03:00`); const range = paginationRange(page, filters.pageSize); return await query.order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to); };
  const { data, error, total, page, pageCount } = await loadClampedPage(filters.page, filters.pageSize, load);
  if (error) throw new Error(`Unable to load appointments: ${error.message}`);
  filters.page = page;
  return { rows: (data ?? []).map((row) => ({ ...row, centers: first(row.centers), services: first(row.services), appointment_slots: first(row.appointment_slots) })) as AppointmentRow[], total, page, pageSize: filters.pageSize, pageCount, filters };
}

function normalizeAppointmentParams(params: AppointmentParams) { return { ...normalizeListParams(params, ["created_at", "appointment_id", "status"], "created_at"), status: params.status || "all", center: params.center || "all", service: params.service || "all", from: params.from || "", to: params.to || "" }; }

export async function getSlots(params: SlotParams = {}): Promise<PaginatedResult<SlotRow> & { filters: ReturnType<typeof normalizeSlotParams> }> {
  const filters = normalizeSlotParams(params);
  const client = adminSupabase();
  const appointmentsRelation = filters.booking === "booked" ? "appointments!inner(appointment_id,status)" : "appointments(appointment_id,status)";
  let matchingCenterIds: string[] = [];
  if (filters.q) {
    const { data: matchingCenters } = await client.from("centers").select("id").ilike("name", `%${filters.q}%`).limit(100);
    matchingCenterIds = (matchingCenters ?? []).map((center) => center.id);
  }
  const load = async (page: number) => {
    let query = client.from("appointment_slots").select(`id,slot_reference,starts_at,is_active,center_id,service_id,centers(id,name),services(id,name),${appointmentsRelation}`, { count: "exact" });
    if (filters.q) query = query.or([`slot_reference.ilike.%${filters.q}%`, matchingCenterIds.length ? `center_id.in.(${matchingCenterIds.join(",")})` : ""].filter(Boolean).join(","));
    if (filters.status !== "all") query = query.eq("is_active", filters.status === "active");
    if (filters.center !== "all") query = query.eq("center_id", filters.center);
    if (filters.booking === "available") query = query.is("appointments", null);
    if (filters.from) query = query.gte("starts_at", `${filters.from}T00:00:00+03:00`);
    if (filters.to) query = query.lte("starts_at", `${filters.to}T23:59:59+03:00`);
    const range = paginationRange(page, filters.pageSize);
    return await query.order(filters.sort, { ascending: filters.direction === "asc" }).range(range.from, range.to);
  };
  const { data, error, total, page, pageCount } = await loadClampedPage(filters.page, filters.pageSize, load);
  if (error) throw new Error(`Unable to load slots: ${error.message}`);
  const rows = (data ?? []).map((row) => ({ ...row, centers: first(row.centers), services: first(row.services), appointments: row.appointments ?? [] })) as SlotRow[];
  filters.page = page;
  return { rows, total, page, pageSize: filters.pageSize, pageCount, filters };
}
function normalizeSlotParams(params: SlotParams) { return { ...normalizeListParams(params, ["starts_at", "slot_reference", "is_active"], "starts_at"), status: params.status || "all", booking: params.booking || "all", center: params.center || "all", from: params.from || "", to: params.to || "" }; }

export async function getAppointmentDetail(id: string) {
  const { data, error } = await adminSupabase().from("appointments").select("*,centers(*),services(*),appointment_slots(*)").eq("appointment_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, centers: first(data.centers), services: first(data.services), appointment_slots: first(data.appointment_slots) } : null;
}
