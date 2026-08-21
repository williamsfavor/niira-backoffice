"use server";

import { revalidatePath } from "next/cache";
import { requireBackofficeUser } from "@/lib/backoffice-auth";
import { adminSupabase, testAdminId } from "@/lib/admin-supabase";

const value = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const checked = (form: FormData, name: string) => form.get(name) === "on";
function refresh(...paths: string[]) { paths.forEach((path) => revalidatePath(path)); }
async function audit(action: string, entityType: string, entityId: string, afterData: unknown) { await adminSupabase().from("audit_logs").insert({ actor_type: "admin", actor_admin_id: testAdminId, action, entity_type: entityType, entity_id: entityId, after_data: afterData }); }
async function processResolutionNotification(ticketId: string) {
  const backendUrl = process.env.NIIRA_BACKEND_URL?.replace(/\/$/, "");
  const secret = process.env.NIIRA_INTERNAL_SECRET;
  if (!backendUrl || !secret) {
    console.warn(`[NIRA] resolution for ${ticketId} is queued, but NIIRA_BACKEND_URL or NIIRA_INTERNAL_SECRET is missing.`);
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
    console.error(`[NIRA] resolution for ${ticketId} was saved, but immediate notification processing failed:`, error);
  }
}

export async function createCenter(form: FormData) {
  await requireBackofficeUser(); const name = value(form, "name"), district = value(form, "district"), address = value(form, "address");
  if (!name || !district || !address) throw new Error("Centre name, district, and address are required.");
  const payload = { name, district, address, phone: value(form, "phone") || null, hours: value(form, "hours") || null, is_active: checked(form, "is_active"), last_edited_by: testAdminId, last_edited_at: new Date().toISOString() };
  const { data, error } = await adminSupabase().from("centers").insert(payload).select().single(); if (error) throw new Error(error.message);
  await audit("create", "center", data.id, data); refresh("/", "/centers");
}
export async function toggleCenter(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), isActive = value(form, "is_active") === "true";
  const { data, error } = await adminSupabase().from("centers").update({ is_active: isActive, last_edited_by: testAdminId, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit(isActive ? "activate" : "deactivate", "center", id, data); refresh("/", "/", "/centers");
}
export async function createFaq(form: FormData) {
  await requireBackofficeUser(); const question = value(form, "question"), answer = value(form, "answer"), category = value(form, "category");
  if (!question || !answer || !category) throw new Error("FAQ question, answer, and category are required.");
  const payload = { question, answer, category, keywords: value(form, "keywords").split(",").map((keyword) => keyword.trim()).filter(Boolean), priority: Number(value(form, "priority") || 100), is_active: checked(form, "is_active"), last_edited_by: testAdminId, last_edited_at: new Date().toISOString() };
  const { data, error } = await adminSupabase().from("faqs").insert(payload).select().single(); if (error) throw new Error(error.message);
  await audit("create", "faq", data.id, data); refresh("/", "/faqs");
}
export async function toggleFaq(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), isActive = value(form, "is_active") === "true";
  const { data, error } = await adminSupabase().from("faqs").update({ is_active: isActive, last_edited_by: testAdminId, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit(isActive ? "activate" : "deactivate", "faq", id, data); refresh("/", "/faqs");
}
export async function claimTicket(form: FormData) {
  await requireBackofficeUser(); const ticketId = value(form, "ticket_id");
  const { data, error } = await adminSupabase().from("tickets").update({ assigned_to: testAdminId, status: "InProgress", updated_at: new Date().toISOString() }).eq("ticket_id", ticketId).select().single(); if (error) throw new Error(error.message);
  await audit("assign", "ticket", ticketId, data); refresh("/", "/tickets");
}
export async function resolveTicket(form: FormData) {
  await requireBackofficeUser(); const ticketId = value(form, "ticket_id"), resolutionNote = value(form, "resolution_note");
  if (!resolutionNote) throw new Error("A resolution note is required before closing a ticket.");
  const { data, error } = await adminSupabase().from("tickets").update({ status: "Resolved", resolution_note: resolutionNote, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("ticket_id", ticketId).select().single(); if (error) throw new Error(error.message);
  await audit("resolve", "ticket", ticketId, data); await processResolutionNotification(ticketId); refresh("/", "/tickets");
}
export async function retryResolutionNotification(form: FormData) {
  await requireBackofficeUser();
  const ticketId = value(form, "ticket_id");
  if (!ticketId) throw new Error("Ticket reference is required.");
  const { error } = await adminSupabase().from("notification_outbox").update({ status: "Pending", next_attempt_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("event_type", "ticket_resolved").eq("aggregate_id", ticketId).neq("status", "Sent");
  if (error) throw new Error(error.message);
  await audit("retry_notification", "ticket", ticketId, { channel: "whatsapp" });
  await processResolutionNotification(ticketId);
  refresh("/tickets");
}
export async function createAppointmentSlot(form: FormData) {
  await requireBackofficeUser(); const centerId = value(form, "center_id"), startsAt = value(form, "starts_at");
  if (!centerId || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error("A valid collection centre and visit time are required.");
  const { data, error } = await adminSupabase().from("appointment_slots").insert({ center_id: centerId, starts_at: new Date(startsAt).toISOString(), is_active: true }).select().single(); if (error) throw new Error(error.message);
  await audit("create", "appointment_slot", data.slot_reference ?? data.id, data); refresh("/", "/appointments");
}

export async function updateCenter(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), name = value(form, "name"), district = value(form, "district"), address = value(form, "address");
  if (!id || !name || !district || !address) throw new Error("Centre name, district, and address are required.");
  const client = adminSupabase(); const { data: before } = await client.from("centers").select("*").eq("id", id).single();
  const { data, error } = await client.from("centers").update({ name, district, address, phone: value(form, "phone") || null, hours: value(form, "hours") || null, is_active: checked(form, "is_active"), last_edited_by: testAdminId, last_edited_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit("update", "center", id, { before, after: data }); refresh("/", "/centers", "/appointments");
}
export async function deleteCenter(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"); const client = adminSupabase(); const { data: before } = await client.from("centers").select("*").eq("id", id).single();
  const { error } = await client.from("centers").delete().eq("id", id); if (error) throw new Error("This centre cannot be deleted while applications, bookings, or slots reference it. Deactivate it instead.");
  await audit("delete", "center", id, before); refresh("/", "/centers", "/appointments");
}
export async function updateFaq(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), question = value(form, "question"), answer = value(form, "answer"), category = value(form, "category");
  if (!id || !question || !answer || !category) throw new Error("FAQ question, answer, and category are required."); const client = adminSupabase(); const { data: before } = await client.from("faqs").select("*").eq("id", id).single();
  const { data, error } = await client.from("faqs").update({ question, answer, category, keywords: value(form, "keywords").split(",").map((keyword) => keyword.trim()).filter(Boolean), priority: Number(value(form, "priority") || 100), is_active: checked(form, "is_active"), last_edited_by: testAdminId, last_edited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message);
  await audit("update", "faq", id, { before, after: data }); refresh("/", "/faqs");
}
export async function deleteFaq(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"); const client = adminSupabase(); const { data: before } = await client.from("faqs").select("*").eq("id", id).single();
  const { error } = await client.from("faqs").delete().eq("id", id); if (error) throw new Error(error.message); await audit("delete", "faq", id, before); refresh("/", "/faqs");
}
export async function createTicket(form: FormData) {
  await requireBackofficeUser(); const phone = value(form, "phone_number"), issue = value(form, "issue_text"), applicationId = value(form, "application_id"); if (!phone || !issue) throw new Error("Phone number and issue are required.");
  const { data, error } = await adminSupabase().from("tickets").insert({ phone_number: phone, application_id: applicationId || null, issue_text: issue, status: "Open" }).select().single(); if (error) throw new Error(error.message); await audit("create", "ticket", data.ticket_id, data); refresh("/", "/tickets");
}
export async function updateTicket(form: FormData) {
  await requireBackofficeUser(); const ticketId = value(form, "ticket_id"), issue = value(form, "issue_text"), status = value(form, "status"), note = value(form, "resolution_note"); if (!ticketId || !issue || !["Open", "InProgress", "Resolved"].includes(status)) throw new Error("Invalid ticket update."); if (status === "Resolved" && !note) throw new Error("A resolution note is required.");
  const client = adminSupabase(); const { data: before } = await client.from("tickets").select("*").eq("ticket_id", ticketId).single(); const update = { issue_text: issue, status, resolution_note: note || null, resolved_at: status === "Resolved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }; const { data, error } = await client.from("tickets").update(update).eq("ticket_id", ticketId).select().single(); if (error) throw new Error(error.message); await audit("update", "ticket", ticketId, { before, after: data }); if (status === "Resolved" && before?.status !== "Resolved") await processResolutionNotification(ticketId); refresh("/", "/tickets");
}
export async function deleteTicket(form: FormData) {
  await requireBackofficeUser(); const ticketId = value(form, "ticket_id"), client = adminSupabase(); const { data: before } = await client.from("tickets").select("*").eq("ticket_id", ticketId).single(); const { error } = await client.from("tickets").delete().eq("ticket_id", ticketId); if (error) throw new Error(error.message); await audit("delete", "ticket", ticketId, before); refresh("/", "/tickets");
}
export async function updateAppointmentSlot(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), startsAt = value(form, "starts_at"); if (!id || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error("A valid slot time is required."); const client = adminSupabase(); const { data: before } = await client.from("appointment_slots").select("*").eq("id", id).single(); const { data, error } = await client.from("appointment_slots").update({ starts_at: new Date(startsAt).toISOString(), is_active: checked(form, "is_active") }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit("update", "appointment_slot", id, { before, after: data }); refresh("/appointments");
}
export async function deleteAppointmentSlot(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), client = adminSupabase(); const { data: before } = await client.from("appointment_slots").select("*").eq("id", id).single(); const { error } = await client.from("appointment_slots").delete().eq("id", id); if (error) throw new Error("A booked slot cannot be deleted. Deactivate it instead."); await audit("delete", "appointment_slot", id, before); refresh("/appointments");
}
export async function updateAppointment(form: FormData) {
  await requireBackofficeUser(); const id = value(form, "id"), status = value(form, "status"); if (!id || !["Confirmed", "Cancelled", "Completed"].includes(status)) throw new Error("Invalid appointment status."); const client = adminSupabase(); const { data: before } = await client.from("appointments").select("*").eq("id", id).single(); const { data, error } = await client.from("appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select().single(); if (error) throw new Error(error.message); await audit("update", "appointment", id, { before, after: data }); refresh("/", "/appointments");
}
export async function updateSettings(form: FormData) {
  await requireBackofficeUser(); const payload = { id: "nira-config", ticket_sla_hours: Number(value(form, "ticket_sla_hours")), messaging_window_hours: Number(value(form, "messaging_window_hours")), session_ttl_minutes: Number(value(form, "session_ttl_minutes")), escalation_fail_count_threshold: Number(value(form, "escalation_fail_count_threshold")), updated_by: testAdminId, updated_at: new Date().toISOString() }; if (Object.values(payload).some((item) => typeof item === "number" && (!Number.isInteger(item) || item < 1))) throw new Error("Settings must be positive whole numbers."); const { data, error } = await adminSupabase().from("app_settings").upsert(payload).select().single(); if (error) throw new Error(error.message); await audit("update", "settings", "nira-config", data); refresh("/settings");
}
