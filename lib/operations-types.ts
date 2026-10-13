export type StageStatus = "Complete" | "InProgress" | "Pending" | "Rejected";
export type ApplicationStage = { name: string; status: StageStatus; description?: string };
export const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = typeof weekdays[number];
export type DayHours = { closed: boolean; opensAt?: string; closesAt?: string };
export type WeeklyHours = Record<Weekday, DayHours>;

export class FieldValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "FieldValidationError";
  }
}

export function normalizeUgandaPhone(input: string) {
  const raw = input.replace(/\s+/g, "");
  if (!raw) return null;
  const local = raw.replace(/^\+?256/, "").replace(/^0/, "");
  if (!/^[17]\d{8}$/.test(local)) throw new FieldValidationError("phone", "Enter nine local digits beginning with 1 or 7.");
  return `+256${local}`;
}

export function validateWeeklyHours(hours: WeeklyHours) {
  for (const day of weekdays) {
    const row = hours[day];
    if (row.closed) continue;
    if (!/^\d{2}:\d{2}$/.test(row.opensAt || "") || !/^\d{2}:\d{2}$/.test(row.closesAt || "") || row.opensAt! >= row.closesAt!) {
      throw new FieldValidationError(`${day}_opens`, `${day.replace(/^./, (letter) => letter.toUpperCase())} needs an opening time earlier than its closing time.`);
    }
  }
  return hours;
}

export function parseStages(value: unknown, currentStage?: string | null): ApplicationStage[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) raw = value;
  if (typeof value === "string") {
    try {
      const decoded: unknown = JSON.parse(value);
      if (Array.isArray(decoded)) raw = decoded;
    } catch {
      raw = [];
    }
  }
  const parsed = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) return [];
    const normalized = String(row.status || "Pending").toLowerCase().replace(/[^a-z]/g, "");
    const status: StageStatus = normalized === "complete" || normalized === "completed" ? "Complete" : normalized === "inprogress" || name === currentStage ? "InProgress" : normalized === "rejected" ? "Rejected" : "Pending";
    return [{ name, status, description: typeof row.description === "string" ? row.description : undefined }];
  });
  if (!parsed.length && currentStage) return [{ name: currentStage, status: "InProgress" }];
  return parsed;
}

export function emptyWeeklyHours(): WeeklyHours {
  return Object.fromEntries(weekdays.map((day) => [day, { closed: day === "saturday" || day === "sunday", opensAt: "08:00", closesAt: "17:00" }])) as WeeklyHours;
}

export function parseWeeklyHours(value: unknown): WeeklyHours {
  const fallback = emptyWeeklyHours();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  for (const day of weekdays) {
    const row = (value as Record<string, unknown>)[day];
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    fallback[day] = { closed: Boolean(item.closed), opensAt: String(item.opensAt || "08:00"), closesAt: String(item.closesAt || "17:00") };
  }
  return fallback;
}

export function weeklyHoursSummary(hours: WeeklyHours) {
  const open = weekdays.filter((day) => !hours[day].closed);
  if (!open.length) return "Closed";
  return open.map((day) => `${day.slice(0, 3).replace(/^./, (c) => c.toUpperCase())} ${hours[day].opensAt}–${hours[day].closesAt}`).join(", ");
}
