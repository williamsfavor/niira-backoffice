import "server-only";
import { adminSupabase } from "./admin-supabase";
import type { Permission } from "./permissions";

export type ReportValue = string | number | boolean | null;
export type ReportRow = Record<string, ReportValue>;
export type ReportParams = {
  dataset?: string; columns?: string | string[]; q?: string; status?: string;
  from?: string; to?: string; sort?: string; direction?: string; page?: string; size?: string;
  type?: string; stage?: string; assignment?: string; center?: string; service?: string;
  district?: string; category?: string; delivery?: string; entity?: string;
};

export type Field = { key: string; label: string; select?: string; path?: string; sortable?: boolean };
export type DatasetFilter = { key: keyof ReportParams; column: string; label: string; values?: string[]; kind?: "text" | "uuid"; nullMode?: "assignment" };
export type Dataset = {
  key: string; label: string; table: string; fields: Field[]; defaults: string[];
  search: string[]; dateField: string; permission: Permission; statusField?: string; booleanStatus?: boolean; statuses?: string[]; filters?: DatasetFilter[];
};

export const reportDatasets: Dataset[] = [
  { key: "applications", label: "Applications", table: "applications", permission: "applications:read", dateField: "last_update", search: ["application_id", "applicant_name", "phone_number"], statusField: "status", statuses: ["Pending", "Processing", "Ready", "Rejected"], filters: [{ key: "type", column: "application_type", label: "Application type", values: ["New", "Renewal", "Replacement", "Correction"] }, { key: "stage", column: "current_stage", label: "Current stage", values: ["Application received", "Verification", "Card Production", "Ready for collection", "Collected"] }], defaults: ["application_id", "applicant_name", "application_type", "status", "current_stage", "last_update"], fields: [
    ["application_id", "Application ID"], ["applicant_name", "Applicant"], ["phone_number", "Phone"], ["application_type", "Type"], ["status", "Status"], ["current_stage", "Current stage"], ["submitted_date", "Submitted"], ["last_update", "Last update"],
    { key: "assigned_center", label: "Assigned centre", select: "assigned_center:centers!applications_assigned_center_id_fkey(name)", path: "assigned_center.name" },
  ].map(field) },
  { key: "tickets", label: "Support tickets", table: "tickets", permission: "tickets:read", dateField: "created_at", search: ["ticket_id", "phone_number", "issue_text"], statusField: "status", statuses: ["Open", "InProgress", "Resolved"], filters: [{ key: "assignment", column: "assigned_to", label: "Assignment", values: ["assigned", "unassigned"], nullMode: "assignment" }], defaults: ["ticket_id", "phone_number", "issue_text", "status", "assignee", "created_at"], fields: [
    ["ticket_id", "Ticket"], ["phone_number", "Phone"], ["application_id", "Application"], ["issue_text", "Issue"], ["status", "Status"], ["resolution_note", "Resolution"], ["created_at", "Created"], ["updated_at", "Updated"], ["resolved_at", "Resolved"],
    { key: "assignee", label: "Assignee", select: "assignee:admin_users!tickets_assigned_to_fkey(name)", path: "assignee.name" },
  ].map(field) },
  { key: "appointments", label: "Appointments", table: "appointments", permission: "appointments:read", dateField: "created_at", search: ["appointment_id", "customer_name", "phone_number"], statusField: "status", statuses: ["Confirmed", "Completed", "Cancelled"], filters: [{ key: "center", column: "center_id", label: "Centre ID", kind: "uuid" }, { key: "service", column: "service_id", label: "Service ID", kind: "uuid" }], defaults: ["appointment_id", "customer_name", "service", "center", "status", "created_at"], fields: [
    ["appointment_id", "Appointment"], ["customer_name", "Citizen"], ["phone_number", "Phone"], ["service_type", "Service snapshot"], ["status", "Status"], ["source", "Source"], ["created_at", "Created"],
    { key: "center", label: "Centre", select: "center:centers(name)", path: "center.name" }, { key: "service", label: "Service", select: "service:services(name)", path: "service.name" },
  ].map(field) },
  { key: "slots", label: "Availability slots", table: "appointment_slots", permission: "appointments:read", dateField: "starts_at", search: ["slot_reference"], statusField: "is_active", booleanStatus: true, statuses: ["active", "inactive"], filters: [{ key: "center", column: "center_id", label: "Centre ID", kind: "uuid" }, { key: "service", column: "service_id", label: "Service ID", kind: "uuid" }], defaults: ["slot_reference", "center", "starts_at", "is_active"], fields: [
    ["slot_reference", "Slot reference"], ["starts_at", "Starts at"], ["is_active", "Active"], ["created_at", "Created"], { key: "center", label: "Centre", select: "center:centers(name)", path: "center.name" }, { key: "service", label: "Service", select: "service:services(name)", path: "service.name" },
  ].map(field) },
  { key: "centers", label: "Collection centres", table: "centers", permission: "centers:read", dateField: "created_at", search: ["name", "address", "district"], statusField: "is_active", booleanStatus: true, statuses: ["active", "inactive"], filters: [{ key: "district", column: "district", label: "District", kind: "text" }], defaults: ["name", "district", "address", "phone", "hours", "is_active"], fields: [
    ["id", "ID"], ["name", "Centre"], ["district", "District"], ["address", "Address"], ["phone", "Phone"], ["email", "Email"], ["hours", "Hours"], ["is_active", "Active"], ["created_at", "Created"], ["last_edited_at", "Last edited"],
  ].map(field) },
  { key: "services", label: "Services", table: "services", permission: "services:read", dateField: "created_at", search: ["name", "description"], statusField: "is_active", booleanStatus: true, statuses: ["active", "inactive"], defaults: ["name", "description", "expected_duration_minutes", "is_active", "updated_at"], fields: [
    ["id", "ID"], ["name", "Service"], ["description", "Description"], ["expected_duration_minutes", "Expected minutes"], ["is_active", "Active"], ["created_at", "Created"], ["updated_at", "Updated"],
  ].map(field) },
  { key: "faqs", label: "FAQs", table: "faqs", permission: "faqs:read", dateField: "updated_at", search: ["question", "answer", "category"], statusField: "is_active", booleanStatus: true, statuses: ["active", "inactive"], filters: [{ key: "category", column: "category", label: "Category", values: ["Status", "Collection", "Requirements", "Timeline", "Troubleshooting"] }], defaults: ["category", "question", "priority", "view_count", "is_active", "updated_at"], fields: [
    ["id", "ID"], ["category", "Category"], ["question", "Question"], ["answer", "Answer"], ["priority", "Priority"], ["view_count", "Views"], ["is_active", "Active"], ["updated_at", "Updated"],
  ].map(field) },
  { key: "notifications", label: "Notifications", table: "notification_outbox", permission: "tickets:read", dateField: "created_at", search: ["aggregate_id", "event_type", "last_error"], statusField: "status", statuses: ["Pending", "Processing", "Sent", "Failed"], filters: [{ key: "delivery", column: "delivery_status", label: "Delivery state", values: ["queued", "sent", "delivered", "read", "failed", "undelivered"] }], defaults: ["aggregate_id", "event_type", "status", "delivery_status", "attempts", "created_at"], fields: [
    ["id", "ID"], ["aggregate_id", "Related record"], ["event_type", "Event"], ["status", "Status"], ["delivery_status", "Delivery"], ["attempts", "Attempts"], ["last_error", "Last error"], ["created_at", "Created"], ["sent_at", "Sent"],
  ].map(field) },
  { key: "audit_logs", label: "Audit logs", table: "audit_logs", permission: "audit:read", dateField: "created_at", search: ["action", "entity_type", "entity_id", "reason"], filters: [{ key: "entity", column: "entity_type", label: "Entity type", values: ["center", "service", "appointment", "appointment_slot", "faq", "ticket", "settings"] }], defaults: ["action", "entity_type", "entity_id", "actor", "reason", "created_at"], fields: [
    ["id", "ID"], ["action", "Action"], ["entity_type", "Entity type"], ["entity_id", "Entity ID"], ["reason", "Reason"], ["created_at", "Created"], { key: "actor", label: "Administrator", select: "actor:admin_users!audit_logs_actor_admin_id_fkey(name)", path: "actor.name" },
  ].map(field) },
];

function field(value: Field | string[]): Field {
  return Array.isArray(value) ? { key: value[0] ?? "", label: value[1] ?? value[0] ?? "", sortable: true } : value;
}

export function normalizeReportParams(params: ReportParams, permissions: readonly Permission[]) {
  const available = reportDatasets.filter((item) => permissions.includes(item.permission));
  if (!available.length) throw new Error("Your role does not have access to any report datasets.");
  const dataset = available.find((item) => item.key === params.dataset) ?? available[0];
  const allowed = new Set(dataset.fields.map((item) => item.key));
  const rawColumns = Array.isArray(params.columns) ? params.columns : (params.columns || "").split(",");
  const requested = rawColumns.filter((key) => allowed.has(key));
  const columns = requested.length ? [...new Set(requested)] : dataset.defaults;
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const q = (params.q || "").replace(/[^\p{L}\p{N}+\-\s]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const sortField = dataset.fields.find((item) => item.key === params.sort && item.sortable)?.key ?? dataset.dateField;
  const requestedStatus = clean(params.status);
  const status = requestedStatus && dataset.statuses?.includes(requestedStatus) ? requestedStatus : "all";
  const filterValues = Object.fromEntries((dataset.filters ?? []).map((filter) => {
    const requested = clean(params[filter.key] as string | undefined);
    const valid = filter.values ? filter.values.includes(requested) : filter.kind === "uuid" ? isUuid(requested) : Boolean(requested);
    return [filter.key, valid ? requested : ""];
  }));
  let from = date(params.from), to = date(params.to);
  if (from && to && from > to) [from, to] = [to, from];
  return { dataset, columns, q, status, filterValues, from, to, sort: sortField, direction: params.direction === "asc" ? "asc" as const : "desc" as const, page, pageSize, available };
}

function date(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}
function clean(value?: string) { return (value || "").replace(/[^\p{L}\p{N}_+\-\s]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export function reportFilterSummary(normalized: ReturnType<typeof normalizeReportParams>) {
  const parts = [`search=${normalized.q || "any"}`, `status=${normalized.status}`, `from=${normalized.from || "any"}`, `to=${normalized.to || "any"}`];
  for (const filter of normalized.dataset.filters ?? []) parts.push(`${String(filter.key)}=${normalized.filterValues[filter.key] || "any"}`);
  return parts.join("; ");
}
function readPath(row: Record<string, unknown>, path: string): ReportValue {
  let value: unknown = row;
  for (const part of path.split(".")) {
    if (Array.isArray(value)) value = value[0];
    value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : null;
  }
  if (Array.isArray(value)) value = value[0] ?? null;
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : value == null ? null : JSON.stringify(value);
}

async function queryPage(params: ReportParams, permissions: readonly Permission[], page: number, pageSize: number, maskApplicationNames = true) {
  const normalized = normalizeReportParams({ ...params, page: String(page), size: String(pageSize) }, permissions);
  const { dataset, columns } = normalized;
  const selected = columns.map((key) => dataset.fields.find((item) => item.key === key)!);
  const expressions = [...new Set(selected.map((item) => item.select ?? item.key))];
  let query = adminSupabase().from(dataset.table).select(expressions.join(","), { count: "exact" });
  if (normalized.q) query = query.or(dataset.search.map((column) => `${column}.ilike.%${normalized.q}%`).join(","));
  if (dataset.statusField && normalized.status !== "all") {
    query = dataset.booleanStatus ? query.eq(dataset.statusField, normalized.status === "active") : query.eq(dataset.statusField, normalized.status);
  }
  for (const filter of dataset.filters ?? []) {
    const selected = normalized.filterValues[filter.key];
    if (!selected) continue;
    if (filter.nullMode === "assignment") query = selected === "assigned" ? query.not(filter.column, "is", null) : query.is(filter.column, null);
    else query = query.eq(filter.column, selected);
  }
  if (normalized.from) query = query.gte(dataset.dateField, `${normalized.from}T00:00:00+03:00`);
  if (normalized.to) query = query.lte(dataset.dateField, `${normalized.to}T23:59:59+03:00`);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.order(normalized.sort, { ascending: normalized.direction === "asc" }).range(from, from + pageSize - 1);
  if (error) throw new Error(`Unable to build ${dataset.label.toLowerCase()} report: ${error.message}`);
  const rows = (data ?? []).map((raw) => {
    const row = Object.fromEntries(selected.map((item) => [item.key, readPath(raw as unknown as Record<string, unknown>, item.path ?? item.key)]));
    if (maskApplicationNames && dataset.key === "applications" && typeof row.applicant_name === "string") row.applicant_name = maskName(row.applicant_name);
    return row;
  });
  return { normalized, rows, total: count ?? 0 };
}

export async function getReportPreview(params: ReportParams, permissions: readonly Permission[], maskApplicationNames = true) {
  const normalized = normalizeReportParams(params, permissions);
  const result = await queryPage(params, permissions, normalized.page, normalized.pageSize, maskApplicationNames);
  const total = result.total;
  const pageCount = Math.max(1, Math.ceil(total / normalized.pageSize));
  if (normalized.page > pageCount) return getReportPreview({ ...params, page: String(pageCount) }, permissions, maskApplicationNames);
  return { ...result, page: normalized.page, pageSize: normalized.pageSize, pageCount };
}

export async function getReportExport(params: ReportParams, permissions: readonly Permission[], maskApplicationNames = true) {
  const first = await queryPage(params, permissions, 1, 1000, maskApplicationNames);
  if (first.total > 50_000) throw new Error("This report exceeds 50,000 rows. Add filters or a date range before exporting.");
  const rows = [...first.rows];
  for (let page = 2; page <= Math.ceil(first.total / 1000); page += 1) rows.push(...(await queryPage(params, permissions, page, 1000, maskApplicationNames)).rows);
  return { normalized: first.normalized, rows, total: first.total };
}

export function reportFieldLabel(datasetKey: string, key: string) {
  return reportDatasets.find((item) => item.key === datasetKey)?.fields.find((item) => item.key === key)?.label ?? key;
}

function maskName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return `${first}${rest[0] ? ` ${rest[0][0]}.` : ""}`;
}
