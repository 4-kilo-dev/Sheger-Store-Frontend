/**
 * Ethiopian civil clock: a 24h Western day maps to four non-overlapping
 * 6-hour periods, each displayed on a 12-hour Ethiopian face (offset −6h).
 *
 * | Period              | Eth face     | Western (local)   |
 * |---------------------|--------------|-------------------|
 * | Morning  ጠዋት       | 12:00–06:00  | 06:00–12:00       |
 * | Afternoon ከሰዓት     | 06:00–12:00  | 12:00–18:00       |
 * | Evening  ማታ        | 12:00–06:00  | 18:00–24:00       |
 * | Night    ለሊት       | 06:00–12:00  | 00:00–06:00       |
 *
 * Boundary hours belong to the later period (e.g. Western 12:00 → afternoon 06:00).
 */

export type EthiopianDayPeriod = "morning" | "afternoon" | "evening" | "night";

export const ETHIOPIAN_DAY_PERIODS: ReadonlyArray<{
  id: EthiopianDayPeriod;
  labelAm: string;
  labelEn: string;
  /** Ethiopian face hours selectable in this period. */
  hours: readonly number[];
}> = [
  {
    id: "morning",
    labelAm: "ጠዋት",
    labelEn: "Morning",
    hours: [12, 1, 2, 3, 4, 5],
  },
  {
    id: "afternoon",
    labelAm: "ከሰዓት",
    labelEn: "Afternoon",
    hours: [6, 7, 8, 9, 10, 11],
  },
  {
    id: "evening",
    labelAm: "ማታ",
    labelEn: "Evening",
    hours: [12, 1, 2, 3, 4, 5],
  },
  {
    id: "night",
    labelAm: "ለሊት",
    labelEn: "Night",
    hours: [6, 7, 8, 9, 10, 11],
  },
] as const;

const GEEZ_DIGITS = ["፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"] as const;

export function toGeezNumerals(value: string | number): string {
  return String(value).replace(/\d/g, (d) => {
    const n = Number(d);
    if (n === 0) return "0";
    return GEEZ_DIGITS[n - 1] ?? d;
  });
}

export function getEthiopianDayPeriod(westernHour: number): EthiopianDayPeriod {
  const h = ((Math.floor(westernHour) % 24) + 24) % 24;
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 24) return "evening";
  return "night";
}

export function getEthiopianDayPeriodMeta(period: EthiopianDayPeriod) {
  return ETHIOPIAN_DAY_PERIODS.find((p) => p.id === period)!;
}

/** Western local hour (0–23) → Ethiopian face hour (1–12). */
export function westernHourToEthiopianFace(westernHour: number): number {
  const h = ((Math.floor(westernHour) % 24) + 24) % 24;
  const eth24 = (h - 6 + 24) % 24;
  const face = eth24 % 12;
  return face === 0 ? 12 : face;
}

/** Ethiopian period + face hour (1–12) → Western local hour (0–23). */
export function ethiopianToWesternHour(
  period: EthiopianDayPeriod,
  ethHour: number,
): number {
  const h = ((ethHour % 12) + 12) % 12; // 12 → 0, 1→1, … 11→11

  switch (period) {
    case "morning":
      return 6 + h; // 12→6 … 5→11
    case "afternoon":
      return 6 + h; // 6→12 … 11→17
    case "evening":
      return 18 + h; // 12→18 … 5→23
    case "night":
      return (h - 6 + 24) % 24; // 6→0 … 11→5
  }
}

export type EthiopianTimeParts = {
  period: EthiopianDayPeriod;
  ethHour: number;
  minute: number;
  labelAm: string;
  /** e.g. "07:30 ከሰዓት" */
  timeLabel: string;
};

export function westernToEthiopianTime(
  westernHour: number,
  minute: number,
  numerals: "latn" | "geez" = "latn",
): EthiopianTimeParts {
  const period = getEthiopianDayPeriod(westernHour);
  const ethHour = westernHourToEthiopianFace(westernHour);
  const meta = getEthiopianDayPeriodMeta(period);
  const hh = String(ethHour).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, Math.floor(minute)))).padStart(2, "0");
  const clock = numerals === "geez" ? toGeezNumerals(`${hh}:${mm}`) : `${hh}:${mm}`;
  return {
    period,
    ethHour,
    minute: Math.floor(minute),
    labelAm: meta.labelAm,
    timeLabel: `${clock} ${meta.labelAm}`,
  };
}

/** Format HH:mm (24h Western) as Ethiopian face + period. */
export function formatEthiopianTimeOfDay(
  timeHHmm: string,
  numerals: "latn" | "geez" = "latn",
): string {
  const [hStr, mStr] = timeHHmm.split(":");
  const h = Number.parseInt(hStr || "0", 10);
  const m = Number.parseInt(mStr || "0", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeHHmm;
  return westernToEthiopianTime(h, m, numerals).timeLabel;
}

export function formatEthiopianDateTimeClock(
  date: Date,
  numerals: "latn" | "geez" = "latn",
): string {
  return westernToEthiopianTime(date.getHours(), date.getMinutes(), numerals).timeLabel;
}

/** Build Western `HH:mm` from Ethiopian period selection. */
export function ethiopianSelectionToWesternHHmm(
  period: EthiopianDayPeriod,
  ethHour: number,
  minute: number,
): string {
  const hours = ethiopianToWesternHour(period, ethHour);
  const mm = String(Math.max(0, Math.min(59, Math.floor(minute)))).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseWesternHHmm(value: string): { hour: number; minute: number } {
  const [hStr, mStr] = (value || "12:00").split(":");
  const hour = Number.parseInt(hStr || "12", 10);
  const minute = Number.parseInt(mStr || "0", 10);
  return {
    hour: Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 12,
    minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0,
  };
}
