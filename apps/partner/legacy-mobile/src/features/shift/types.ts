export type ShiftSession = {
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
};

export type ShiftStateSnapshot = {
  shiftStarted: boolean;
  online: boolean;
  locationEnabled: boolean;
  startedAt?: number;
};

export type ShiftHistoryItem = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  online?: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  updatedAt?: string;
  maxActiveJobs?: number;
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: number;
};
