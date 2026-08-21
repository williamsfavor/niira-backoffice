import { Status } from "./ui";

type Slot = {
  id: string;
  slot_reference: string;
  starts_at: string;
  is_active: boolean;
  centers: { name: string } | null;
};

export function AppointmentSlotsTable({ slots }: { slots: Slot[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Slot reference</th><th>Collection centre</th><th>Visit time</th><th>Status</th></tr></thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td className="mono"><strong>{slot.slot_reference}</strong></td>
              <td>{slot.centers?.name ?? "—"}</td>
              <td>{new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(slot.starts_at))}</td>
              <td><Status value={slot.is_active ? "Active" : "Inactive"} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
