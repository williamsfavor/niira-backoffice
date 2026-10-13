import { describe, expect, it } from "vitest";
import { mapNominatimResults, normalizeGeocodeQuery } from "@/lib/geocode";

describe("geocoding boundary", () => {
  it("normalizes unsafe provider search punctuation", () => {
    expect(normalizeGeocodeQuery("  Kampala,(Central)  ")).toBe("Kampala Central");
  });

  it("keeps valid Uganda results and rejects malformed or out-of-country coordinates", () => {
    const results = mapNominatimResults([
      { place_id: 1, display_name: "Kampala, Uganda", lat: "0.3476", lon: "32.5825", address: { city: "Kampala" } },
      { place_id: 2, display_name: "Nairobi, Kenya", lat: "-1.2864", lon: "36.8172" },
      { place_id: 3, display_name: "Broken", lat: "not-a-number", lon: "32" },
    ]);
    expect(results).toEqual([{ id: "1", label: "Kampala, Uganda", latitude: 0.3476, longitude: 32.5825, district: "Kampala" }]);
  });
});
