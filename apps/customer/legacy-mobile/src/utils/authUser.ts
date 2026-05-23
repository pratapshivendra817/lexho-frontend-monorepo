function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    let json = "";
    const atobFn = (globalThis as any)?.atob;
    if (typeof atobFn === "function") {
      json = atobFn(padded);
    } else if (typeof (globalThis as any)?.Buffer !== "undefined") {
      json = (globalThis as any).Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function resolveUserIdFromAuth(authUserId: unknown, token: string): number {
  const fromAuth = Number(authUserId ?? 0);
  if (Number.isFinite(fromAuth) && fromAuth > 0) return fromAuth;

  const payload = decodeJwtPayload(token);
  const candidates = [payload?.userId, payload?.id, payload?.sub];
  for (const candidate of candidates) {
    const value = Number(candidate ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}
