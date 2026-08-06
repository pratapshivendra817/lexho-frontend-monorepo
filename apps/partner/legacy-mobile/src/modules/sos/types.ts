export type SOSLocation = { latitude: number; longitude: number; accuracy: number | null; capturedAt: string };

export type TriggerSOSRequest = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  address?: string;
  message?: string;
};

export type SOSIncident = {
  eventId: string;
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  address?: string;
  message?: string;
  createdAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
};

export type EmergencyContactInput = {
  name: string;
  phoneNumber: string;
  relationship?: string;
  email?: string;
  primaryContact: boolean;
};

export type EmergencyContact = EmergencyContactInput & { id: string };
