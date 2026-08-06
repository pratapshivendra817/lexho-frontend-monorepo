import { api, extractList, parseApiError } from "./client";

export type CleaningCoverageTask = {
  name: string;
  estimatedMinutes: number;
  icon: string;
};

export type CleaningCoverage = {
  durationHours: number;
  reference: string;
  tasks: CleaningCoverageTask[];
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTask(row: any): CleaningCoverageTask | null {
  const name = String(row?.name ?? "").trim();
  const icon = String(row?.icon ?? "").trim();
  const estimatedMinutes = toNumber(row?.estimatedMinutes, 0);
  if (!name || !icon || estimatedMinutes <= 0) return null;
  return { name, estimatedMinutes, icon };
}

function toCoverage(row: any): CleaningCoverage | null {
  if (row?.active === false) return null;
  const durationHours = toNumber(row?.durationHours, 0);
  const reference = String(row?.reference ?? "").trim();
  const tasks = Array.isArray(row?.tasks)
    ? row.tasks.map(toTask).filter((item: CleaningCoverageTask | null): item is CleaningCoverageTask => Boolean(item))
    : [];
  if (durationHours <= 0 || !reference || tasks.length === 0) return null;
  return { durationHours, reference, tasks };
}

export async function getCleaningCoverage(durationHours?: number | null): Promise<CleaningCoverage[]> {
  try {
    const params = durationHours ? { durationHours } : undefined;
    const { data } = await api.get("/api/cleaning-coverage", { params });
    return extractList<any>(data)
      .map(toCoverage)
      .filter((item: CleaningCoverage | null): item is CleaningCoverage => Boolean(item));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch cleaning coverage"));
  }
}
