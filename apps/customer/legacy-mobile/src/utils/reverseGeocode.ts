type ReverseGeocodeResult = {
  displayName: string;
  shortName: string;
  area?: string;
  sector?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Reverse geocode timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function pickShortName(address: any): string {
  const parts = [
    address?.suburb,
    address?.neighbourhood,
    address?.city_district,
    address?.city,
    address?.town,
    address?.village,
    address?.state,
  ]
    .map((part: any) => String(part ?? "").trim())
    .filter(Boolean);
  return parts.slice(0, 3).join(", ");
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    `&zoom=18&addressdetails=1`;

  try {
    const response = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }),
      6000,
    );
    if (!response.ok) return null;
    const data: any = await response.json();
    const displayName = String(data?.display_name ?? "").trim();
    const shortName = pickShortName(data?.address);
    const address = data?.address ?? {};
    const sector = displayName.match(/\bSector\s+\d+[A-Za-z]?\b/i)?.[0] ?? "";
    if (!displayName) return null;
    return {
      displayName,
      shortName: shortName || displayName,
      area: String(address?.suburb ?? address?.neighbourhood ?? address?.city_district ?? "").trim(),
      sector: String(sector).trim(),
      city: String(address?.city ?? address?.town ?? address?.village ?? address?.county ?? "").trim(),
      state: String(address?.state ?? "").trim(),
      country: String(address?.country ?? "India").trim(),
      pincode: String(address?.postcode ?? "").trim(),
    };
  } catch {
    return null;
  }
}
