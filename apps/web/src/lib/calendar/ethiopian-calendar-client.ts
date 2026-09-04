import { EthDateTime } from "ethiopian-calendar-date-converter";

const ADDIS_ABABA_TIME_ZONE = "Africa/Addis_Ababa";

export const ETHIOPIAN_MONTH_NAMES = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት",
  "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
] as const;

export const ETHIOPIAN_WEEKDAY_HEADERS = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"] as const;

export type EthiopianDayPeriod = "LELIT" | "TEWAT" | "KESEAT" | "MATA";

export const ETHIOPIAN_TIME_OPTIONS: Array<{
  id: EthiopianDayPeriod;
  label: string;
  hours: number[];
}> = [
  { id: "LELIT", label: "ለሊት · Lelit", hours: [6, 7, 8, 9, 10, 11] },
  { id: "TEWAT", label: "ጠዋት · Tewat", hours: [12, 1, 2, 3, 4, 5] },
  { id: "KESEAT", label: "ከሰአት · Keseat", hours: [6, 7, 8, 9, 10, 11] },
  { id: "MATA", label: "ማታ · Mata", hours: [12, 1, 2, 3, 4, 5] },
];

const timePeriodLabels: Record<EthiopianDayPeriod, string> = {
  LELIT: "ለሊት",
  TEWAT: "ጠዋት",
  KESEAT: "ከሰአት",
  MATA: "ማታ",
};

export type EthiopianDate = {
  year: number;
  month: number;
  day: number;
  monthName: string;
};

export type EthiopianMonthDay = {
  ethiopian: EthiopianDate;
  gregorianDate: string;
  weekday: number;
  isToday: boolean;
};

function canonicalDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseCanonicalDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function addisToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ADDIS_ABABA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (kind: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === kind)?.value);
  return canonicalDate(value("year"), value("month"), value("day"));
}

/** Converts a Gregorian calendar date without depending on the calendar API. */
export function toEthiopianDate(value: string): EthiopianDate | null {
  const date = parseCanonicalDate(value);
  if (!date) return null;

  // Noon UTC avoids local browser timezone offsets changing the calendar day.
  const converted = EthDateTime.fromEuropeanDate(
    new Date(Date.UTC(date.year, date.month - 1, date.day, 12)),
  );
  return {
    year: converted.year,
    month: converted.month,
    day: converted.date,
    monthName: ETHIOPIAN_MONTH_NAMES[converted.month - 1] ?? "",
  };
}

export function toGregorianDate(year: number, month: number, day: number): string {
  const converted = new EthDateTime(year, month, day, 12).toEuropeanDate();
  return canonicalDate(
    converted.getUTCFullYear(),
    converted.getUTCMonth() + 1,
    converted.getUTCDate(),
  );
}

function monthLength(year: number, month: number): number {
  if (month !== 13) return 30;
  try {
    new EthDateTime(year, month, 6, 12).toEuropeanDate();
    return 6;
  } catch {
    return 5;
  }
}

export function getEthiopianMonth(year: number, month: number): EthiopianMonthDay[] {
  const today = addisToday();
  return Array.from({ length: monthLength(year, month) }, (_, index) => {
    const day = index + 1;
    const gregorianDate = toGregorianDate(year, month, day);
    return {
      ethiopian: {
        year,
        month,
        day,
        monthName: ETHIOPIAN_MONTH_NAMES[month - 1] ?? "",
      },
      gregorianDate,
      weekday: new Date(`${gregorianDate}T12:00:00.000Z`).getUTCDay(),
      isToday: gregorianDate === today,
    };
  });
}

export function getCurrentEthiopianDate(): EthiopianDate {
  return toEthiopianDate(addisToday())!;
}

export function formatEthiopianDate(value: string): string | null {
  const date = toEthiopianDate(value);
  return date ? `${date.day} ${date.monthName} ${date.year}` : null;
}

export function getEthiopianTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hour24 = Number(match?.[1]);
  const minute = Number(match?.[2]);
  if (!match || hour24 > 23 || minute > 59) return null;

  const dayPeriod: EthiopianDayPeriod = hour24 < 6 ? "LELIT"
    : hour24 < 12 ? "TEWAT"
      : hour24 < 18 ? "KESEAT"
        : "MATA";
  const ethiopianHour = ((hour24 + 5) % 12) + 1;
  return {
    hour24,
    minute,
    dayPeriod,
    ethiopianHour,
    display: `${ethiopianHour}:${String(minute).padStart(2, "0")} ${timePeriodLabels[dayPeriod]}`,
  };
}

export function toWesternTime(dayPeriod: EthiopianDayPeriod, ethiopianHour: number, minute: number): string {
  const period = ETHIOPIAN_TIME_OPTIONS.find((item) => item.id === dayPeriod);
  if (!period?.hours.includes(ethiopianHour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Invalid Ethiopian time");
  }
  const face = ethiopianHour % 12;
  const hour24 = dayPeriod === "LELIT" ? (face + 18) % 24
    : dayPeriod === "TEWAT" || dayPeriod === "KESEAT" ? 6 + face
      : 18 + face;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
