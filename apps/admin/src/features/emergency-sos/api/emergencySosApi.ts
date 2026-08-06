import { api } from "@/api/axios";
import type { EmergencyIncident, EmergencyIncidentPage } from "../types";

export async function fetchEmergencyIncidents(params: { page: number; limit: number; status?: string; partnerId?: string }): Promise<EmergencyIncidentPage> {
  const { data } = await api.get("/api/v1/admin/emergency/incidents", { params: { page: params.page, limit: params.limit, status: params.status || undefined, partnerId: params.partnerId || undefined } });
  const root = data?.data ?? data ?? {};
  const rows = root.content ?? root.items ?? root.incidents ?? (Array.isArray(root) ? root : []);
  return { content: Array.isArray(rows) ? rows.map(mapIncident) : [], page: Number(root.page ?? root.number ?? params.page), limit: Number(root.limit ?? root.size ?? params.limit), totalElements: Number(root.totalElements ?? root.total ?? rows.length ?? 0), totalPages: Number(root.totalPages ?? Math.ceil(Number(root.totalElements ?? rows.length ?? 0) / params.limit)) };
}

export async function fetchEmergencyIncident(eventId: string) {
  const { data } = await api.get(`/api/v1/admin/emergency/incidents/${encodeURIComponent(eventId)}`);
  return mapIncident(data?.data ?? data);
}

export async function acknowledgeEmergencyIncident(eventId: string, note: string) {
  const { data } = await api.patch(`/api/v1/admin/emergency/incidents/${encodeURIComponent(eventId)}/acknowledge`, { note });
  return mapIncident(data?.data ?? data);
}

export async function resolveEmergencyIncident(eventId: string, note: string) {
  const { data } = await api.patch(`/api/v1/admin/emergency/incidents/${encodeURIComponent(eventId)}/resolve`, { note });
  return mapIncident(data?.data ?? data);
}

function mapIncident(row: any): EmergencyIncident {
  const partner = row?.partner ?? {};
  return {
    eventId: String(row?.eventId ?? row?.id ?? ""),
    partnerId: Number.isFinite(Number(row?.partnerId ?? partner?.id)) ? Number(row?.partnerId ?? partner?.id) : undefined,
    partnerName: row?.partnerName ?? partner?.name,
    partnerPhone: row?.partnerPhone ?? partner?.phone,
    status: String(row?.status ?? "TRIGGERED").toUpperCase(),
    latitude: Number(row?.latitude ?? row?.location?.latitude ?? 0),
    longitude: Number(row?.longitude ?? row?.location?.longitude ?? 0),
    accuracyMeters: row?.accuracyMeters ?? row?.accuracy ?? row?.location?.accuracyMeters ?? null,
    address: row?.address ?? row?.location?.address,
    message: row?.message,
    createdAt: row?.createdAt ?? row?.triggeredAt,
    acknowledgedAt: row?.acknowledgedAt,
    acknowledgedBy: row?.acknowledgedBy,
    resolvedAt: row?.resolvedAt,
    resolvedBy: row?.resolvedBy,
    acknowledgementNote: row?.acknowledgementNote ?? row?.acknowledgeNote,
    resolutionNote: row?.resolutionNote ?? row?.resolveNote,
    requestId: row?.requestId,
    correlationId: row?.correlationId,
  };
}
