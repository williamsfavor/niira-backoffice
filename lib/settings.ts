import "server-only";
import { adminSupabase } from "./admin-supabase";

export async function getSettings() {
  const { data, error } = await adminSupabase().from("app_settings").select("*,updated_by_user:admin_users!app_settings_updated_by_fkey(name,email)").eq("id", "nira-config").maybeSingle();
  if (error) throw new Error(`Unable to load settings: ${error.message}`);
  return data ?? { id: "nira-config", ticket_sla_hours: 24, messaging_window_hours: 24, session_ttl_minutes: 30, escalation_fail_count_threshold: 2, standard_days_by_type: { Renewal: { min: 10, max: 14 }, New: { min: 30, max: 60 }, Replacement: { min: 10, max: 14 }, Correction: { min: 14, max: 30 } }, updated_at: null, updated_by_user: null };
}
