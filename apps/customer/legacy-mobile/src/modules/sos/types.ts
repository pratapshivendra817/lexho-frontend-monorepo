export type SOSLocation = { latitude: number; longitude: number; accuracy: number | null; capturedAt: string };
export type SOSEvent = { eventId: string; eventType: "ACTIVATE" | "LOCATION_UPDATE"; location: SOSLocation; createdAt: string };
export type EmergencyContact = { id: string; name: string; phone: string; relationship?: string; primary?: boolean };
