import Link from "next/link";
import { CalendarCheck, Search } from "lucide-react";
import { createAppointmentSlotResult, updateAppointmentSlotResult } from "@/app/actions/operations";
import { ActionForm, NavigationSubmitButton } from "@/components/action-form";
import { EntityDialog } from "@/components/entity-dialog";
import { Pagination } from "@/components/pagination";
import { Empty, Status } from "@/components/ui";
import { getAppointments, getSlots, type AppointmentParams, type SlotParams, type SlotRow } from "@/lib/appointments";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { getCenterOptions } from "@/lib/centers";
import { getServiceOptions } from "@/lib/services";

type Params = AppointmentParams & SlotParams & { tab?: string };

const formatDate = (value: string) => new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala",
}).format(new Date(value));

function SlotForm({ slot, centers, services }: { slot?: SlotRow; centers: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }> }) {
  return <ActionForm action={slot ? updateAppointmentSlotResult : createAppointmentSlotResult} className="form-grid dialog-form-grid" submitLabel={slot ? "Save slot" : "Publish slot"} pendingLabel="Saving slot…">
    {slot && <input type="hidden" name="id" value={slot.id} />}
    <label>Collection centre<select name="center_id" defaultValue={slot?.centers?.id} disabled={Boolean(slot)} required>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></label>
    <label>Service<select name="service_id" defaultValue={slot?.services?.id || ""}><option value="">Any service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    <label>Visit date and time<input name="starts_at" type="datetime-local" required defaultValue={slot ? new Date(slot.starts_at).toISOString().slice(0, 16) : ""} /></label>
    {slot && <label className="check"><input name="is_active" type="checkbox" defaultChecked={slot.is_active} /> Active</label>}
  </ActionForm>;
}

function AppointmentTabs({ active }: { active: "appointments" | "slots" }) {
  return <nav className="page-tabs" aria-label="Appointment sections"><Link className={active === "appointments" ? "active" : ""} href="/appointments">Appointments</Link><Link className={active === "slots" ? "active" : ""} href="/appointments?tab=slots">Availability slots</Link></nav>;
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const admin = await requireBackofficeAdmin("appointments:read");
  const tab = params.tab === "slots" ? "slots" : "appointments";
  const [centers, services] = await Promise.all([getCenterOptions(), getServiceOptions()]);
  const writable = admin.permissions.includes("appointments:write");

  if (tab === "slots") {
    const result = await getSlots(params);
    return <section className="page">
      <div className="page-title"><div><p className="eyebrow">OFFICE VISITS</p><h2>Appointments</h2><p className="page-copy">Manage citizen bookings and the visit times that collection centres publish.</p></div>{writable && <EntityDialog title="Create availability slot" trigger="Create slot"><SlotForm centers={centers} services={services} /></EntityDialog>}</div>
      <AppointmentTabs active="slots" />
      <p className="section-help">Slot references identify each individual visit time. Citizens book one available slot through WhatsApp.</p>
      <form className="table-toolbar">
        <input type="hidden" name="tab" value="slots" />
        <label className="table-search"><Search size={16} /><input name="q" defaultValue={result.filters.q} placeholder="Slot reference" /></label>
        <label>Status<select name="status" defaultValue={result.filters.status}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label>Booking<select name="booking" defaultValue={result.filters.booking}><option value="all">All slots</option><option value="available">Available</option><option value="booked">Booked</option></select></label>
        <label>Centre<select name="center" defaultValue={result.filters.center}><option value="all">All centres</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></label>
        <label>From<input name="from" type="date" defaultValue={result.filters.from} /></label>
        <label>To<input name="to" type="date" defaultValue={result.filters.to} /></label>
        <label>Sort<select name="sort" defaultValue={result.filters.sort}><option value="starts_at">Visit time</option><option value="slot_reference">Reference</option><option value="is_active">Status</option></select></label>
        <label>Direction<select name="direction" defaultValue={result.filters.direction}><option value="asc">Earliest first</option><option value="desc">Latest first</option></select></label>
        <label>Rows<select name="size" defaultValue={String(result.pageSize)}><option>10</option><option>20</option><option>50</option></select></label>
        <NavigationSubmitButton>Apply</NavigationSubmitButton>
      </form>
      <article className="panel data-panel">
        <div className="table-summary"><span>{result.total} slots</span><small>Page {result.page} of {result.pageCount}</small></div>
        <div className="table-wrap"><table><thead><tr><th>Slot reference</th><th>Centre</th><th>Service</th><th>Visit time</th><th>Booking</th><th>Status</th><th>Actions</th></tr></thead><tbody>{result.rows.map((slot) => <tr key={slot.id}><td className="mono">{slot.slot_reference}</td><td>{slot.centers?.name || "—"}</td><td>{slot.services?.name || "Any"}</td><td>{formatDate(slot.starts_at)}</td><td>{slot.appointments.length ? "Booked" : "Available"}</td><td><Status value={slot.is_active ? "Active" : "Inactive"} /></td><td>{writable && <EntityDialog edit title={`Edit ${slot.slot_reference}`} trigger="Edit"><SlotForm slot={slot} centers={centers} services={services} /></EntityDialog>}</td></tr>)}</tbody></table></div>
        <Pagination pathname="/appointments" params={{ tab: "slots", q: result.filters.q, status: result.filters.status, booking: result.filters.booking, center: result.filters.center, from: result.filters.from, to: result.filters.to, sort: result.filters.sort, direction: result.filters.direction, size: String(result.pageSize) }} page={result.page} pageCount={result.pageCount} pageSize={result.pageSize} total={result.total} />
      </article>
    </section>;
  }

  const result = await getAppointments(params);
  return <section className="page">
    <div className="page-title"><div><p className="eyebrow">OFFICE VISITS</p><h2>Appointments</h2><p className="page-copy">Manage citizen bookings and the visit times that collection centres publish.</p></div></div>
    <AppointmentTabs active="appointments" />
    <form className="table-toolbar">
      <input type="hidden" name="tab" value="appointments" />
      <label className="table-search"><Search size={16} /><input name="q" defaultValue={result.filters.q} placeholder="Reference, citizen, or phone" /></label>
      <label>Status<select name="status" defaultValue={result.filters.status}><option value="all">All statuses</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></label>
      <label>Centre<select name="center" defaultValue={result.filters.center}><option value="all">All centres</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></label>
      <label>Service<select name="service" defaultValue={result.filters.service}><option value="all">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label>From<input name="from" type="date" defaultValue={result.filters.from} /></label>
      <label>To<input name="to" type="date" defaultValue={result.filters.to} /></label>
      <label>Sort<select name="sort" defaultValue={result.filters.sort}><option value="created_at">Created</option><option value="appointment_id">Reference</option><option value="status">Status</option></select></label>
      <label>Direction<select name="direction" defaultValue={result.filters.direction}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      <label>Rows<select name="size" defaultValue={String(result.pageSize)}><option>10</option><option>20</option><option>50</option></select></label>
      <NavigationSubmitButton>Apply</NavigationSubmitButton>
    </form>
    <article className="panel data-panel">
      <div className="table-summary"><span>{result.total} appointments</span><small>Page {result.page} of {result.pageCount}</small></div>
      {result.rows.length ? <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Citizen</th><th>Centre</th><th>Service</th><th>Visit time</th><th>Status</th></tr></thead><tbody>{result.rows.map((appointment) => <tr key={appointment.id}><td><Link className="mono" href={`/appointments/${appointment.appointment_id}`}>{appointment.appointment_id}</Link></td><td>{appointment.customer_name || appointment.phone_number}</td><td>{appointment.centers?.name || "—"}</td><td>{appointment.services?.name || appointment.service_type}</td><td>{appointment.appointment_slots ? formatDate(appointment.appointment_slots.starts_at) : "—"}</td><td><Status value={appointment.status} /></td></tr>)}</tbody></table></div> : <Empty><CalendarCheck size={28} /><h3>No appointments found</h3><p>Change the search or filters and try again.</p></Empty>}
      <Pagination pathname="/appointments" params={{ tab: "appointments", q: result.filters.q, status: result.filters.status, center: result.filters.center, service: result.filters.service, from: result.filters.from, to: result.filters.to, sort: result.filters.sort, direction: result.filters.direction, size: String(result.pageSize) }} page={result.page} pageCount={result.pageCount} pageSize={result.pageSize} total={result.total} />
    </article>
  </section>;
}
