function normalizeAddressPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitAddressParts(value: unknown): string[] {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function addUniquePart(parts: string[], seen: Set<string>, value: unknown) {
  for (const part of splitAddressParts(value)) {
    const key = normalizeAddressPart(part);
    if (!key || seen.has(key)) continue;
    const alreadyIncluded = Array.from(seen).some((existing) => existing.includes(key));
    if (alreadyIncluded) continue;
    seen.add(key);
    parts.push(part);
  }
}

export function formatAddressLine(row: any, fallback = "Address not available") {
  const parts: string[] = [];
  const seen = new Set<string>();

  addUniquePart(parts, seen, row?.flatNo);
  addUniquePart(parts, seen, row?.floor ? `Floor ${row.floor}` : "");
  addUniquePart(parts, seen, row?.buildingName);
  addUniquePart(parts, seen, row?.landmark ? `Near ${row.landmark}` : "");
  addUniquePart(parts, seen, row?.addressLine ?? row?.fullAddress);
  addUniquePart(parts, seen, row?.area);
  addUniquePart(parts, seen, row?.sector);
  addUniquePart(parts, seen, row?.city);
  addUniquePart(parts, seen, row?.state);
  addUniquePart(parts, seen, row?.country);
  addUniquePart(parts, seen, row?.pincode ?? row?.postalCode);

  return parts.length > 0 ? parts.join(", ") : fallback;
}
