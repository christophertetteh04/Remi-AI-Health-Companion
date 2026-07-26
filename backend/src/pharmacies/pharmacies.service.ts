import { Injectable } from "@nestjs/common";

@Injectable()
export class PharmaciesService {
  async findNearby(lat: number, lng: number) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey || !lat || !lng) {
      return {
        results: [],
        fallbackMessage:
          "We couldn't search for pharmacies right now — try asking your community pharmacy or the nearest health center directly.",
      };
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=pharmacy&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const results = (data.results || []).map((p: any) => ({
        name: p.name,
        address: p.vicinity,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
        openNow: p.opening_hours?.open_now ?? null,
      }));

      // Coverage in Ghana is unconfirmed outside major cities (see
      // planning notes) — if results are thin, don't present an
      // empty-looking screen as if that means "no pharmacies exist."
      if (results.length === 0) {
        return {
          results: [],
          fallbackMessage:
            "We didn't find pharmacy listings for this area — try asking your community pharmacy or the nearest health center directly.",
        };
      }
      return { results, fallbackMessage: null };
    } catch {
      return {
        results: [],
        fallbackMessage: "We couldn't reach the pharmacy search right now — please try again shortly.",
      };
    }
  }
}
