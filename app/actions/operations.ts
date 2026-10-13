"use server";

import { revalidatePath } from "next/cache";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { FieldValidationError, normalizeUgandaPhone, validateWeeklyHours, weekdays, weeklyHoursSummary, type WeeklyHours } from "@/lib/operations-types";
import type { ActionResult } from "@/lib/list";

const value = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const checked = (form: FormData, name: string) => form.get(name) === "on";
function refresh(...paths: string[]) { paths.forEach((path) => revalidatePath(path)); }
async function actorId() { return (await requireBackofficeAdmin()).id; }
async function audit(action: string, entityType: string, entityId: string, afterData: unknown) { await adminSupabase().from("audit_logs").insert({ actor_type: "admin", actor_admin_id: await actorId(), action, entity_type: entityType, entity_id: entityId, after_data: afterData }); }
function phone(form: FormData) { return normalizeUgandaPhone(value(form, "phone")); }
function weeklyHours(form: FormData) { const schedule = {} as WeeklyHours; for (const day of weekdays) { const closed = form.get(`${day}_closed`) === "on"; const opensAt = value(form, `${day}_opens`), closesAt = value(form, `${day}_closes`); schedule[day] = { closed, opensAt: opensAt || "08:00", closesAt: closesAt || "17:00" }; } return validateWeeklyHours(schedule); }
function serviceIds(form: FormData) { return form.getAll("services").map(String).filter(Boolean); }
async function syncCenterServices(centerId: string, ids: string[]) { const client = adminSupabase(); const removed = await client.from("center_services").delete().eq("center_id", centerId); if (removed.error) throw new Error(removed.error.message); if (ids.length) { const added = await client.from("center_services").insert(ids.map((serviceId) => ({ center_id: centerId, service_id: serviceId }))); if (added.error) throw new Error(added.error.message); } }
async function processTicketNotifications(ticketId: string) {
  const backendUrl = process.env.NIIRA_BACKEND_URL?.replace(/\/$/, "");
  const secret = process.env.NIIRA_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
  if (!backendUrl || !secret) {
    console.warn(`[NIRA] notification for ${ticketId} is queued, but NIIRA_BACKEND_URL or an internal API secret is missing.`);
    return;
  }
  try {
    const response = await fetch(`${backendUrl}/internal/notifications/process`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ ticketId, limit: 1 }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`notification processor returned ${response.status}`);
  } catch (error) {
    console.error(`[NIRA] notification for ${ticketId} was saved, but immediate processing failed:`, error);
  }
}

export async function createCenter(form: FormData) {
  const admin = await requireBackofficeAdmin("centers:write"); const name = value(form, "name"), district = value(form, "district"), address = value(form, "address");
  if (!name || !district || !address) throw new Error("Centre name, district, and address are required.");
  const schedule = weeklyHours(form); const longitude = Number(value(form, "longitude")), latitude = Number(value(form, "latitude"));
  const payload = { name, district, address, phone: phone(form), email: value(form, "email") || null, hours: weeklyHoursSummary(schedule), weekly_hours: schedule, coordinates: Number.isFinite(longitude) && Number.isFinite(latitude) ? { type: "Point", coordinates: [longitude, latitude] } : null, is_active: checked(form, "is_active"), last_edited_by: admin.id, last_edited_at: new Date().toISOString() };
  const { data, error } = await adminSupabase().from("centers").insert(payload).select().single(); if (error) throw new Error(error.message);
  await syncCenterServices(data.id, serviceIds(form)); await audit("create", "center", data.id, data); refresh("/", "/centers");
}
export async function toggleCenter(form: FormData) {
  const admin = await requireBackofficeAdmin("centers:write"); const id = value(form, "id"), isActive = value(form, "is_active") === "true";
  const { data, error } = await adminSupabase().from("centers").update({ is_active: isActive, last_edited_by: admin.id, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit(isActive ? "activate" : "deactivate", "center", id, data); refresh("/", "/", "/centers");
}
export async function createFaq(form: FormData) {
  const admin = await requireBackofficeAdmin("faqs:write"); const question = value(form, "question"), answer = value(form, "answer"), category = value(form, "category");
  if (!question || !answer || !category) throw new Error("FAQ question, answer, and category are required.");
  const payload = { question, answer, category, keywords: value(form, "keywords").split(",").map((keyword) => keyword.trim()).filter(Boolean), related_faq_ids: form.getAll("related_faq_ids").map(String), priority: Number(value(form, "priority") || 100), is_active: checked(form, "is_active"), last_edited_by: admin.id, last_edited_at: new Date().toISOString() };
  const { data, error } = await adminSupabase().from("faqs").insert(payload).select().single(); if (error) throw new Error(error.message);
  await audit("create", "faq", data.id, data); refresh("/", "/faqs");
}
export async function toggleFaq(form: FormData) {
  const admin = await requireBackofficeAdmin("faqs:write"); const id = value(form, "id"), isActive = value(form, "is_active") === "true";
  const { data, error } = await adminSupabase().from("faqs").update({ is_active: isActive, last_edited_by: admin.id, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit(isActive ? "activate" : "deactivate", "faq", id, data); refresh("/", "/faqs");
}
export async function claimTicket(form: FormData) {
  const admin = await requireBackofficeAdmin("tickets:write"); const ticketId = value(form, "ticket_id");
  const { data, error } = await adminSupabase().from("tickets").update({ assigned_to: admin.id, status: "InProgress", updated_at: new Date().toISOString() }).eq("ticket_id", ticketId).select().single(); if (error) throw new Error(error.message);
  await audit("assign", "ticket", ticketId, data); refresh("/", "/tickets");
}
export async function changeTicketStatus(form: FormData) {
  const admin = await requireBackofficeAdmin("tickets:write");
  const ticketId = value(form, "ticket_id"), status = value(form, "status"), resolutionNote = value(form, "resolution_note");
  if (!ticketId || !["Open", "InProgress", "Resolved"].includes(status)) throw new Error("Choose a valid ticket status.");
  if (status === "Resolved" && !resolutionNote) throw new Error("Add a resolution before marking this ticket resolved.");
  const client = adminSupabase();
  const { data: before, error: beforeError } = await client.from("tickets").select("*").eq("ticket_id", ticketId).single();
  if (beforeError) throw new Error(beforeError.message);
  const update = {
    status,
    assigned_to: status === "InProgress" && !before.assigned_to ? admin.id : before.assigned_to,
    resolution_note: status === "Resolved" ? resolutionNote : null,
    resolved_at: status === "Resolved" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("tickets").update(update).eq("ticket_id", ticketId).select().single();
  if (error) throw new Error(error.message);
  await audit("status_change", "ticket", ticketId, { before, after: data });
  if (status === "Resolved" && before.status !== "Resolved") await processTicketNotifications(ticketId);
  refresh("/", "/tickets", `/tickets/${ticketId}`);
}
export async function sendTicketMessage(form: FormData) {
  const admin = await requireBackofficeAdmin("tickets:write");
  const ticketId = value(form, "ticket_id"), message = value(form, "message"), visibility = value(form, "visibility") === "Internal" ? "Internal" : "Citizen";
  if (!ticketId || !message) throw new Error("Write a message before sending.");
  if (message.length > 1000) throw new Error("Ticket messages cannot exceed 1,000 characters.");
  const { data, error } = await adminSupabase().rpc("create_ticket_message", { p_ticket_id: ticketId, p_body: message, p_created_by: admin.id, p_visibility: visibility });
  if (error) throw new Error(error.message);
  await audit(visibility === "Internal" ? "internal_note" : "respond", "ticket", ticketId, data);
  if (visibility === "Citizen") await processTicketNotifications(ticketId);
  refresh("/tickets", `/tickets/${ticketId}`);
}
export async function retryResolutionNotification(form: FormData) {
  await requireBackofficeAdmin("tickets:write");
  const ticketId = value(form, "ticket_id");
  if (!ticketId) throw new Error("Ticket reference is required.");
  const { error } = await adminSupabase().from("notification_outbox").update({ status: "Pending", next_attempt_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).in("event_type", ["ticket_resolved", "ticket_response"]).eq("aggregate_id", ticketId).neq("status", "Sent");
  if (error) throw new Error(error.message);
  await audit("retry_notification", "ticket", ticketId, { channel: "whatsapp" });
  await processTicketNotifications(ticketId);
  refresh("/tickets");
}
export async function createAppointmentSlot(form: FormData) {
  await requireBackofficeAdmin("appointments:write"); const centerId = value(form, "center_id"), serviceId = value(form, "service_id"), startsAt = value(form, "starts_at");
  if (!centerId || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error("A valid collection centre and visit time are required.");
  const { data, error } = await adminSupabase().from("appointment_slots").insert({ center_id: centerId, service_id: serviceId || null, starts_at: new Date(startsAt).toISOString(), is_active: true }).select().single(); if (error) throw new Error(error.message);
  await audit("create", "appointment_slot", data.slot_reference ?? data.id, data); refresh("/", "/appointments");
}

export async function updateCenter(form: FormData) {
  const admin = await requireBackofficeAdmin("centers:write"); const id = value(form, "id"), name = value(form, "name"), district = value(form, "district"), address = value(form, "address");
  if (!id || !name || !district || !address) throw new Error("Centre name, district, and address are required.");
  const client = adminSupabase(); const { data: before } = await client.from("centers").select("*").eq("id", id).single(); const schedule = weeklyHours(form); const longitude = Number(value(form, "longitude")), latitude = Number(value(form, "latitude"));
  const { data, error } = await client.from("centers").update({ name, district, address, phone: phone(form), email: value(form, "email") || null, hours: weeklyHoursSummary(schedule), weekly_hours: schedule, coordinates: Number.isFinite(longitude) && Number.isFinite(latitude) ? { type: "Point", coordinates: [longitude, latitude] } : null, is_active: checked(form, "is_active"), last_edited_by: admin.id, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await syncCenterServices(id, serviceIds(form)); await audit("update", "center", id, { before, after: data }); refresh("/", "/centers", `/centers/${id}`, "/appointments");
}
export async function deleteCenter(form: FormData) {
  await requireBackofficeAdmin("centers:write"); const id = value(form, "id"); const client = adminSupabase(); const { data: before } = await client.from("centers").select("*").eq("id", id).single();
  const { error } = await client.from("centers").delete().eq("id", id); if (error) throw new Error("This centre cannot be deleted while applications, bookings, or slots reference it. Deactivate it instead.");
  await audit("delete", "center", id, before); refresh("/", "/centers", "/appointments");
}
export async function updateFaq(form: FormData) {
  const admin = await requireBackofficeAdmin("faqs:write"); const id = value(form, "id"), question = value(form, "question"), answer = value(form, "answer"), category = value(form, "category");
  if (!id || !question || !answer || !category) throw new Error("FAQ question, answer, and category are required."); const client = adminSupabase(); const { data: before } = await client.from("faqs").select("*").eq("id", id).single();
  const { data, error } = await client.from("faqs").update({ question, answer, category, keywords: value(form, "keywords").split(",").map((keyword) => keyword.trim()).filter(Boolean), related_faq_ids: form.getAll("related_faq_ids").map(String), priority: Number(value(form, "priority") || 100), is_active: checked(form, "is_active"), last_edited_by: admin.id, last_edited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit("update", "faq", id, { before, after: data }); refresh("/", "/faqs");
}
export async function deleteFaq(form: FormData) {
  await requireBackofficeAdmin("faqs:write"); const id = value(form, "id"); const client = adminSupabase(); const { data: before } = await client.from("faqs").select("*").eq("id", id).single();
  const { error } = await client.from("faqs").delete().eq("id", id); if (error) throw new Error(error.message); await audit("delete", "faq", id, before); refresh("/", "/faqs");
}
export async function createTicket(form: FormData) {
  await requireBackofficeAdmin("tickets:write"); const phone = value(form, "phone_number"), issue = value(form, "issue_text"), applicationId = value(form, "application_id"); if (!phone || !issue) throw new Error("Phone number and issue are required.");
  const { data, error } = await adminSupabase().from("tickets").insert({ phone_number: phone, application_id: applicationId || null, issue_text: issue, status: "Open" }).select().single(); if (error) throw new Error(error.message); await audit("create", "ticket", data.ticket_id, data); refresh("/", "/tickets");
}
export async function updateTicket(form: FormData) {
  await requireBackofficeAdmin("tickets:write"); const ticketId = value(form, "ticket_id"), issue = value(form, "issue_text"), status = value(form, "status"), note = value(form, "resolution_note"); if (!ticketId || !issue || !["Open", "InProgress", "Resolved"].includes(status)) throw new Error("Invalid ticket update."); if (status === "Resolved" && !note) throw new Error("A resolution note is required.");
  const client = adminSupabase(); const { data: before } = await client.from("tickets").select("*").eq("ticket_id", ticketId).single(); const update = { issue_text: issue, status, resolution_note: note || null, resolved_at: status === "Resolved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }; const { data, error } = await client.from("tickets").update(update).eq("ticket_id", ticketId).select().single(); if (error) throw new Error(error.message); await audit("update", "ticket", ticketId, { before, after: data }); if (status === "Resolved" && before?.status !== "Resolved") await processTicketNotifications(ticketId); refresh("/", "/tickets");
}
export async function deleteTicket(form: FormData) {
  await requireBackofficeAdmin("tickets:write"); const ticketId = value(form, "ticket_id"), client = adminSupabase(); const { data: before } = await client.from("tickets").select("*").eq("ticket_id", ticketId).single(); const { error } = await client.from("tickets").delete().eq("ticket_id", ticketId); if (error) throw new Error(error.message); await audit("delete", "ticket", ticketId, before); refresh("/", "/tickets");
}
export async function updateAppointmentSlot(form: FormData) {
  await requireBackofficeAdmin("appointments:write"); const id = value(form, "id"), serviceId = value(form, "service_id"), startsAt = value(form, "starts_at"); if (!id || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error("A valid slot time is required."); const client = adminSupabase(); const { data: before } = await client.from("appointment_slots").select("*").eq("id", id).single(); const { data, error } = await client.from("appointment_slots").update({ service_id: serviceId || null, starts_at: new Date(startsAt).toISOString(), is_active: checked(form, "is_active") }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit("update", "appointment_slot", id, { before, after: data }); refresh("/appointments");
}
export async function deleteAppointmentSlot(form: FormData) {
  await requireBackofficeAdmin("appointments:write"); const id = value(form, "id"), client = adminSupabase(); const { data: before } = await client.from("appointment_slots").select("*").eq("id", id).single(); const { error } = await client.from("appointment_slots").delete().eq("id", id); if (error) throw new Error("A booked slot cannot be deleted. Deactivate it instead."); await audit("delete", "appointment_slot", id, before); refresh("/appointments");
}
export async function updateAppointment(form: FormData) {
  await requireBackofficeAdmin("appointments:write"); const id = value(form, "id"), status = value(form, "status"); if (!id || !["Confirmed", "Cancelled", "Completed"].includes(status)) throw new Error("Invalid appointment status."); const client = adminSupabase(); const { data: before } = await client.from("appointments").select("*").eq("id", id).single(); const { data, error } = await client.from("appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit("update", "appointment", id, { before, after: data }); refresh("/", "/appointments");
}
export async function createService(form: FormData) {
  const admin = await requireBackofficeAdmin("services:write"); const name = value(form, "name"); if (!name) throw new Error("Service name is required.");
  const payload = { name, description: value(form, "description") || null, expected_duration_minutes: Number(value(form, "expected_duration_minutes")) || null, is_active: checked(form, "is_active"), created_by: admin.id, last_edited_by: admin.id, updated_at: new Date().toISOString() };
  const { data, error } = await adminSupabase().from("services").insert(payload).select().single(); if (error) throw new Error(error.message); await audit("create", "service", data.id, data); refresh("/services", "/centers", "/appointments");
}
export async function updateService(form: FormData) {
  const admin = await requireBackofficeAdmin("services:write"); const id = value(form, "id"), name = value(form, "name"); if (!id || !name) throw new Error("Service name is required."); const client = adminSupabase(); const { data: before } = await client.from("services").select("*").eq("id", id).single();
  const { data, error } = await client.from("services").update({ name, description: value(form, "description") || null, expected_duration_minutes: Number(value(form, "expected_duration_minutes")) || null, is_active: checked(form, "is_active"), last_edited_by: admin.id, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit("update", "service", id, { before, after: data }); refresh("/services", "/centers", "/appointments");
}
export async function toggleService(form: FormData) {
  const admin = await requireBackofficeAdmin("services:write"); const id = value(form, "id"), isActive = value(form, "is_active") === "true"; const { data, error } = await adminSupabase().from("services").update({ is_active: isActive, last_edited_by: admin.id, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit(isActive ? "activate" : "deactivate", "service", id, data); refresh("/services", "/centers", "/appointments");
}
export async function updateSettings(form: FormData) {
  const admin = await requireBackofficeAdmin("settings:write"); const types = ["Renewal", "New", "Replacement", "Correction"]; const standardDays = Object.fromEntries(types.map((type) => [type, { min: Number(value(form, `${type.toLowerCase()}_min`)), max: Number(value(form, `${type.toLowerCase()}_max`)) }]));
  const payload = { id: "nira-config", ticket_sla_hours: Number(value(form, "ticket_sla_hours")), messaging_window_hours: Number(value(form, "messaging_window_hours")), session_ttl_minutes: Number(value(form, "session_ttl_minutes")), escalation_fail_count_threshold: Number(value(form, "escalation_fail_count_threshold")), standard_days_by_type: standardDays, updated_by: admin.id, updated_at: new Date().toISOString() };
  if ([payload.ticket_sla_hours, payload.messaging_window_hours, payload.session_ttl_minutes, payload.escalation_fail_count_threshold, ...Object.values(standardDays).flatMap((range) => [range.min, range.max])].some((item) => !Number.isInteger(item) || item < 1) || Object.values(standardDays).some((range) => range.min > range.max)) throw new Error("Settings must be positive whole numbers and minimum days cannot exceed maximum days.");
  const { data, error } = await adminSupabase().from("app_settings").upsert(payload).select().single(); if (error) throw new Error(error.message); await audit("update", "settings", "nira-config", data);
  const backendUrl = process.env.NIIRA_BACKEND_URL?.replace(/\/$/, ""), secret = process.env.NIIRA_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
  let cacheWarning: string | undefined;
  if (!backendUrl || !secret) cacheWarning = "Settings were saved, but immediate bot cache invalidation is not configured. The bot will refresh within 60 seconds.";
  else {
    try { const response = await fetch(`${backendUrl}/internal/settings/invalidate`, { method: "POST", headers: { "x-internal-secret": secret }, cache: "no-store" }); if (!response.ok) cacheWarning = `Settings were saved, but the bot cache endpoint returned ${response.status}. The bot will refresh within 60 seconds.`; }
    catch { cacheWarning = "Settings were saved, but the bot cache could not be reached. The bot will refresh within 60 seconds."; }
  }
  refresh("/settings", "/", "/tickets"); return { cacheWarning };
}

type RequiredFields = Record<string, string>;
async function result(form: FormData, required: RequiredFields, operation: () => Promise<unknown>, message: string): Promise<ActionResult> {
  const fieldErrors = Object.fromEntries(Object.entries(required).filter(([name]) => !value(form, name)).map(([name, label]) => [name, `${label} is required.`]));
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Check the highlighted information and try again.", fieldErrors };
  try { await operation(); return { ok: true, message }; }
  catch (error) {
    if (error instanceof FieldValidationError) return { ok: false, error: "Check the highlighted information and try again.", fieldErrors: { [error.field]: error.message } };
    return { ok: false, error: error instanceof Error ? error.message : "The change could not be saved." };
  }
}

export async function createCenterResult(_previous: ActionResult, form: FormData) { return result(form, { name: "Centre name", district: "District", address: "Address" }, () => createCenter(form), "Centre created successfully."); }
export async function updateCenterResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Centre", name: "Centre name", district: "District", address: "Address" }, () => updateCenter(form), "Centre updated successfully."); }
export async function toggleCenterResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Centre" }, () => toggleCenter(form), "Centre availability updated."); }
export async function createFaqResult(_previous: ActionResult, form: FormData) { return result(form, { question: "Question", answer: "Answer", category: "Category" }, () => createFaq(form), "FAQ created successfully."); }
export async function updateFaqResult(_previous: ActionResult, form: FormData) { return result(form, { id: "FAQ", question: "Question", answer: "Answer", category: "Category" }, () => updateFaq(form), "FAQ updated successfully."); }
export async function toggleFaqResult(_previous: ActionResult, form: FormData) { return result(form, { id: "FAQ" }, () => toggleFaq(form), "FAQ status updated."); }
export async function createServiceResult(_previous: ActionResult, form: FormData) { return result(form, { name: "Service name" }, () => createService(form), "Service created successfully."); }
export async function updateServiceResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Service", name: "Service name" }, () => updateService(form), "Service updated successfully."); }
export async function toggleServiceResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Service" }, () => toggleService(form), "Service status updated."); }
export async function createAppointmentSlotResult(_previous: ActionResult, form: FormData) { return result(form, { center_id: "Collection centre", starts_at: "Visit time" }, () => createAppointmentSlot(form), "Availability slot published."); }
export async function updateAppointmentSlotResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Slot", starts_at: "Visit time" }, () => updateAppointmentSlot(form), "Availability slot updated."); }
export async function updateAppointmentResult(_previous: ActionResult, form: FormData) { return result(form, { id: "Appointment", status: "Status" }, () => updateAppointment(form), "Appointment status updated."); }
export async function claimTicketResult(_previous: ActionResult, form: FormData) { return result(form, { ticket_id: "Ticket" }, () => claimTicket(form), "Ticket assigned to you."); }
export async function changeTicketStatusResult(_previous: ActionResult, form: FormData) { return result(form, { ticket_id: "Ticket", status: "Status" }, () => changeTicketStatus(form), "Ticket status updated."); }
export async function sendTicketMessageResult(_previous: ActionResult, form: FormData) { return result(form, { ticket_id: "Ticket", message: "Message" }, () => sendTicketMessage(form), "Message saved successfully."); }
export async function retryResolutionNotificationResult(_previous: ActionResult, form: FormData) { return result(form, { ticket_id: "Ticket" }, () => retryResolutionNotification(form), "WhatsApp delivery retry requested."); }
export async function updateSettingsResult(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  try { const outcome = await updateSettings(form); return { ok: true, message: "Operational settings saved.", warning: outcome.cacheWarning }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Settings could not be saved." }; }
}
