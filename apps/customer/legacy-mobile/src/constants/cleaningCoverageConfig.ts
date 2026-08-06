export type CleaningCoverageTask = {
  name: string;
  estimatedMinutes: number;
  icon: string;
};

export type CleaningCoverageOption = {
  durationHours: number;
  reference: string;
  tasks: CleaningCoverageTask[];
};

export const CLEANING_COVERAGE_REFERENCE = "2BHK";

export const CLEANING_COVERAGE_OPTIONS: CleaningCoverageOption[] = [
  {
    durationHours: 0.5,
    reference: CLEANING_COVERAGE_REFERENCE,
    tasks: [
      { name: "Utensils", estimatedMinutes: 20, icon: "utensils" },
      { name: "Dusting & Wiping", estimatedMinutes: 15, icon: "dusting" },
      { name: "Balcony Cleaning", estimatedMinutes: 15, icon: "balcony" },
    ],
  },
  {
    durationHours: 1,
    reference: CLEANING_COVERAGE_REFERENCE,
    tasks: [
      { name: "Bathroom Cleaning", estimatedMinutes: 40, icon: "bathroom" },
      { name: "Utensils", estimatedMinutes: 20, icon: "utensils" },
      { name: "Balcony Cleaning", estimatedMinutes: 30, icon: "balcony" },
      { name: "Fan Cleaning", estimatedMinutes: 20, icon: "fan" },
      { name: "Dusting & Wiping", estimatedMinutes: 30, icon: "dusting" },
    ],
  },
  {
    durationHours: 1.5,
    reference: CLEANING_COVERAGE_REFERENCE,
    tasks: [
      { name: "Bathroom Cleaning", estimatedMinutes: 40, icon: "bathroom" },
      { name: "Utensils", estimatedMinutes: 20, icon: "utensils" },
      { name: "Balcony Cleaning", estimatedMinutes: 30, icon: "balcony" },
      { name: "Fan Cleaning", estimatedMinutes: 20, icon: "fan" },
      { name: "Dusting & Wiping", estimatedMinutes: 30, icon: "dusting" },
      { name: "Sweeping & Mopping", estimatedMinutes: 30, icon: "mopping" },
      { name: "Window Cleaning", estimatedMinutes: 25, icon: "window" },
    ],
  },
  {
    durationHours: 2,
    reference: CLEANING_COVERAGE_REFERENCE,
    tasks: [
      { name: "Bathroom Cleaning", estimatedMinutes: 40, icon: "bathroom" },
      { name: "Utensils", estimatedMinutes: 20, icon: "utensils" },
      { name: "Balcony Cleaning", estimatedMinutes: 30, icon: "balcony" },
      { name: "Fan Cleaning", estimatedMinutes: 20, icon: "fan" },
      { name: "Dusting & Wiping", estimatedMinutes: 30, icon: "dusting" },
      { name: "Sweeping & Mopping", estimatedMinutes: 30, icon: "mopping" },
      { name: "Window Cleaning", estimatedMinutes: 25, icon: "window" },
      { name: "Kitchen Cleaning", estimatedMinutes: 30, icon: "kitchen" },
    ],
  },
];

export function getCleaningCoverageForDuration(durationHours?: number | null) {
  const duration = Number(durationHours ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return CLEANING_COVERAGE_OPTIONS.find((item) => item.durationHours === duration) ?? null;
}
