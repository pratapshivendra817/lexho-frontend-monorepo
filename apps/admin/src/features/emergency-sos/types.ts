export type EmergencyIncidentStatus = "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | string;

export type EmergencyIncident = {
  eventId: string;
  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  status: EmergencyIncidentStatus;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  address?: string;
  message?: string;
  createdAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  acknowledgementNote?: string;
  resolutionNote?: string;
  requestId?: string;
  correlationId?: string;
};

export type EmergencyIncidentPage = { content: EmergencyIncident[]; page: number; limit: number; totalElements: number; totalPages: number };
