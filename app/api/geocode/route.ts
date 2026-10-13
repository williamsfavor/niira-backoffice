import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { mapNominatimResults, normalizeGeocodeQuery } from "@/lib/geocode";

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(request: Request) {
  await requireBackofficeAdmin("centers:write");
  const query = normalizeGeocodeQuery(new URL(request.url).searchParams.get("q"));
  if (query.length < 3) return NextResponse.json({ error: "Enter at least three characters." }, { status: 400 });
  const key = query.toLowerCase(); const cached = cache.get(key); if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
  const { data: claimed, error: limitError } = await adminSupabase().rpc("claim_internal_rate_limit", { p_key: "nominatim-search", p_interval_ms: 1000 });
  if (limitError) return NextResponse.json({ error: "Address search rate limiting is temporarily unavailable." }, { status: 503 });
  if (!claimed) return NextResponse.json({ error: "Please wait a moment before searching again." }, { status: 429, headers: { "retry-after": "1" } });
  const base = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
  const url = new URL("/search", base); url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("countrycodes", "ug"); url.searchParams.set("limit", "6"); url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, { headers: { "user-agent": process.env.MAP_USER_AGENT || "NIRA-Control-Centre/1.0 (contact: operations@nira.go.ug)", accept: "application/json" }, next: { revalidate: 86400 } });
  if (!response.ok) return NextResponse.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
  const raw = await response.json() as Array<Record<string, unknown>>;
  const data = mapNominatimResults(raw);
  cache.set(key, { expires: Date.now() + 86_400_000, data });
  return NextResponse.json(data);
}
