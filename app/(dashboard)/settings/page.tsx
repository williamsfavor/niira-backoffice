import { updateSettingsResult } from "@/app/actions/operations";
import { ActionForm } from "@/components/action-form";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { getSettings } from "@/lib/settings";

const applicationTypes = ["Renewal", "New", "Replacement", "Correction"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const admin = await requireBackofficeAdmin("settings:read");
  const settings = await getSettings();
  const writable = admin.permissions.includes("settings:write");
  const editor = Array.isArray(settings.updated_by_user) ? settings.updated_by_user[0] : settings.updated_by_user;
  return <section className="page">
    <p className="eyebrow">BOT CONFIGURATION</p>
    <h2>Operational settings</h2>
    <p className="page-copy">These values are read by the WhatsApp bot and back-office SLA indicators. Changes are audited and invalidate the bot cache immediately.</p>
    {saved === "1" && <p className="success-banner" role="status">Settings saved. The bot cache was asked to refresh immediately.</p>}
    <ActionForm action={updateSettingsResult} className="panel settings settings-form" submitLabel="Save changes" pendingLabel="Saving settings…" hideSubmit={!writable}>
      <fieldset className="settings-section"><legend>Support and messaging</legend>
        <label>Ticket SLA (hours)<input name="ticket_sla_hours" type="number" min="1" defaultValue={settings.ticket_sla_hours} required disabled={!writable} /><small>Tickets older than this are marked overdue.</small></label>
        <label>WhatsApp messaging window (hours)<input name="messaging_window_hours" type="number" min="1" defaultValue={settings.messaging_window_hours} required disabled={!writable} /></label>
        <label>Session timeout (minutes)<input name="session_ttl_minutes" type="number" min="1" defaultValue={settings.session_ttl_minutes} required disabled={!writable} /></label>
        <label>Escalation failure threshold<input name="escalation_fail_count_threshold" type="number" min="1" defaultValue={settings.escalation_fail_count_threshold} required disabled={!writable} /><small>How many misunderstood replies trigger the human-support offer.</small></label>
      </fieldset>
      <fieldset className="settings-section full-settings"><legend>Standard processing days</legend><div className="processing-grid">{applicationTypes.map((type) => { const range = settings.standard_days_by_type?.[type] || { min: 1, max: 1 }; return <div key={type}><strong>{type}</strong><label>Minimum<input name={`${type.toLowerCase()}_min`} type="number" min="1" defaultValue={range.min} required disabled={!writable} /></label><label>Maximum<input name={`${type.toLowerCase()}_max`} type="number" min="1" defaultValue={range.max} required disabled={!writable} /></label></div>; })}</div></fieldset>
      <p className="settings-meta">{settings.updated_at ? `Last saved ${new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(settings.updated_at))}${editor?.name ? ` by ${editor.name}` : ""}.` : "Using system defaults."}</p>
    </ActionForm>
  </section>;
}
