export async function searchLocations(query: string) {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      { headers: { "User-Agent": "ConvoyApp/1.0" } }
    );
    return await res.json();
  } catch (e) { return []; }
}
