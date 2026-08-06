#!/usr/bin/env node

/**
 * Fixes legacy absolute image URLs in admin categories/services by converting them
 * to relative asset paths (e.g. "/uploads/..."), so admin and customer apps can
 * resolve them correctly across environments.
 *
 * Usage:
 *   node scripts/fix-admin-image-paths.mjs --base-url https://dev-api.lexho.com --token <ADMIN_JWT>
 *   node scripts/fix-admin-image-paths.mjs --base-url https://dev-api.lexho.com --token <ADMIN_JWT> --apply
 *
 * Flags:
 *   --base-url <url>      Required. API base URL.
 *   --token <jwt>         Required. Admin bearer token.
 *   --apply               Optional. Without this, runs in dry-run mode.
 *   --page-size <n>       Optional. Default 100.
 *   --verbose             Optional. Print per-record decisions.
 */

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx < 0) return fallback;
  return String(args[idx + 1] ?? "").trim();
}

function hasFlag(name) {
  return args.includes(name);
}

const baseUrlInput = readArg("--base-url");
const token = readArg("--token");
const apply = hasFlag("--apply");
const verbose = hasFlag("--verbose");
const pageSizeRaw = readArg("--page-size", "100");
const pageSize = Number.isFinite(Number(pageSizeRaw)) && Number(pageSizeRaw) > 0 ? Number(pageSizeRaw) : 100;

if (!baseUrlInput || !token) {
  console.error("Missing required args.");
  console.error("Example: node scripts/fix-admin-image-paths.mjs --base-url https://dev-api.lexho.com --token <ADMIN_JWT> [--apply]");
  process.exit(1);
}

const baseUrl = baseUrlInput.replace(/\/+$/, "");
const apiHost = new URL(baseUrl).host.toLowerCase();

function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBooleanLike(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "disabled", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  return (
    asArray(root.data).length ? asArray(root.data)
      : asArray(root.items).length ? asArray(root.items)
      : asArray(root.content).length ? asArray(root.content)
      : asArray(root.results).length ? asArray(root.results)
      : asArray(asRecord(root.data).items)
  );
}

function extractTotal(payload, fallback) {
  const root = asRecord(payload);
  return asNumber(root.total ?? root.totalElements ?? asRecord(root.data).total ?? asRecord(root.data).totalElements, fallback);
}

function isProbablyInternalHost(host) {
  const h = host.toLowerCase();
  if (h === apiHost) return true;
  if (h === "localhost" || h === "127.0.0.1" || h === "10.0.2.2") return true;
  if (/^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h) || /^10\./.test(h)) return true;
  return false;
}

function normalizeToRelativeAssetPath(value) {
  const raw = asString(value);
  if (!raw) return { next: "", changed: false, reason: "empty" };

  if (!/^https?:\/\//i.test(raw)) {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    const changed = path !== raw;
    return { next: path, changed, reason: changed ? "relative-normalized" : "already-relative" };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { next: raw, changed: false, reason: "invalid-absolute-url" };
  }

  if (!isProbablyInternalHost(parsed.host)) {
    return { next: raw, changed: false, reason: "external-host-kept" };
  }

  const next = `${parsed.pathname}${parsed.search ?? ""}` || "/";
  return { next, changed: next !== raw, reason: "internal-absolute-to-relative" };
}

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method ?? "GET"} ${path} failed (${res.status}) ${text.slice(0, 400)}`);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchAllCategories() {
  const items = [];
  let page = 1;
  for (;;) {
    const data = await request(`/api/admin/categories?page=${page}&limit=${pageSize}`);
    const rows = extractRows(data);
    items.push(...rows);
    const total = extractTotal(data, items.length);
    if (rows.length === 0 || items.length >= total) break;
    page += 1;
  }
  return items;
}

async function fetchAllServices() {
  const items = [];
  let page = 1;
  for (;;) {
    const data = await request(`/api/admin/services?page=${page}&limit=${pageSize}`);
    const rows = extractRows(data);
    items.push(...rows);
    const total = extractTotal(data, items.length);
    if (rows.length === 0 || items.length >= total) break;
    page += 1;
  }
  return items;
}

async function main() {
  console.log(`[fix-admin-image-paths] mode=${apply ? "APPLY" : "DRY_RUN"} baseUrl=${baseUrl}`);

  const [categories, services] = await Promise.all([fetchAllCategories(), fetchAllServices()]);
  console.log(`[scan] categories=${categories.length} services=${services.length}`);

  const categoryChanges = [];
  for (const row of categories) {
    const rec = asRecord(row);
    const id = asString(rec.id ?? rec.categoryId ?? rec._id);
    const name = asString(rec.name ?? rec.categoryName);
    const current = asString(rec.iconUrl ?? rec.imageUrl);
    const decision = normalizeToRelativeAssetPath(current);
    if (!decision.changed) {
      if (verbose) console.log(`[category:skip] id=${id} reason=${decision.reason} url=${current}`);
      continue;
    }
    categoryChanges.push({ id, name, from: current, to: decision.next, raw: rec });
  }

  const serviceChanges = [];
  for (const row of services) {
    const rec = asRecord(row);
    const id = asString(rec.id ?? rec.serviceId ?? rec._id);
    const name = asString(rec.name ?? rec.serviceName);
    const current = asString(rec.imageUrl ?? rec.thumbnailUrl ?? rec.iconUrl);
    const decision = normalizeToRelativeAssetPath(current);
    if (!decision.changed) {
      if (verbose) console.log(`[service:skip] id=${id} reason=${decision.reason} url=${current}`);
      continue;
    }
    serviceChanges.push({ id, name, from: current, to: decision.next, raw: rec });
  }

  console.log(`[plan] category_updates=${categoryChanges.length} service_updates=${serviceChanges.length}`);

  if (!apply) {
    for (const c of categoryChanges.slice(0, 20)) {
      console.log(`[category] id=${c.id} "${c.name}"`);
      console.log(`  from: ${c.from}`);
      console.log(`  to:   ${c.to}`);
    }
    if (categoryChanges.length > 20) console.log(`... ${categoryChanges.length - 20} more category updates`);

    for (const s of serviceChanges.slice(0, 20)) {
      console.log(`[service] id=${s.id} "${s.name}"`);
      console.log(`  from: ${s.from}`);
      console.log(`  to:   ${s.to}`);
    }
    if (serviceChanges.length > 20) console.log(`... ${serviceChanges.length - 20} more service updates`);
    console.log("Dry-run complete. Re-run with --apply to persist changes.");
    return;
  }

  let categoryUpdated = 0;
  for (const c of categoryChanges) {
    const payload = {
      name: asString(c.raw.name),
      iconUrl: c.to,
      active: asBooleanLike(c.raw.active ?? c.raw.isActive ?? c.raw.status, true),
      status: asBooleanLike(c.raw.active ?? c.raw.isActive ?? c.raw.status, true) ? "ACTIVE" : "INACTIVE",
    };
    await request(`/api/admin/categories/${c.id}`, { method: "PUT", body: JSON.stringify(payload) });
    categoryUpdated += 1;
    console.log(`[category:updated] ${categoryUpdated}/${categoryChanges.length} id=${c.id}`);
  }

  let serviceUpdated = 0;
  for (const s of serviceChanges) {
    const categoryId = asNumber(s.raw.categoryId ?? asRecord(s.raw.category).id, 0);
    const payload = {
      name: asString(s.raw.name ?? s.raw.serviceName),
      description: asString(s.raw.description),
      price: asNumber(s.raw.price ?? s.raw.basePrice, 0),
      service_type: asString(s.raw.service_type ?? s.raw.serviceType),
      categoryId: categoryId > 0 ? categoryId : undefined,
      category_id: categoryId > 0 ? categoryId : undefined,
      imageUrl: s.to,
    };
    await request(`/api/admin/services/${s.id}`, { method: "PUT", body: JSON.stringify(payload) });
    serviceUpdated += 1;
    console.log(`[service:updated] ${serviceUpdated}/${serviceChanges.length} id=${s.id}`);
  }

  console.log(`[done] category_updated=${categoryUpdated} service_updated=${serviceUpdated}`);
}

main().catch((error) => {
  console.error("[fix-admin-image-paths] failed:", error?.message ?? error);
  process.exit(1);
});

