const BASE = "https://www.google.com/maps";

export function mapsSearchUrl(place: string, city?: string): string {
  const q = city && !place.toLowerCase().includes(city.toLowerCase()) ? `${place}, ${city}` : place;
  return `${BASE}/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mapsDirectionsUrl(
  origin: string,
  destination: string,
  waypoints: string[] = [],
): string {
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: "driving" });
  const wp = waypoints.filter(Boolean).slice(0, 8);
  if (wp.length) params.set("waypoints", wp.join("|"));
  return `${BASE}/dir/?${params.toString()}`;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));
}
