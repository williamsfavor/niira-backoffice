export type GeocodeResult = { id: string; label: string; latitude: number; longitude: number; district: string };

const UGANDA_BOUNDS = { south: -1.6, north: 4.4, west: 29.4, east: 35.1 } as const;

export function normalizeGeocodeQuery(value: string | null) {
  return (value || "").replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function mapNominatimResults(rows: Array<Record<string, unknown>>): GeocodeResult[] {
  return rows.flatMap((row) => {
    const latitude = Number(row.lat), longitude = Number(row.lon);
    const id = String(row.place_id || ""), label = String(row.display_name || "").trim();
    if (!id || !label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    if (latitude < UGANDA_BOUNDS.south || latitude > UGANDA_BOUNDS.north || longitude < UGANDA_BOUNDS.west || longitude > UGANDA_BOUNDS.east) return [];
    const address = row.address && typeof row.address === "object" ? row.address as Record<string, unknown> : {};
    return [{ id, label, latitude, longitude, district: String(address.state_district || address.county || address.city || "") }];
  });
}
