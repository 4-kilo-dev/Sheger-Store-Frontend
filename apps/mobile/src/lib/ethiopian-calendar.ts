import { EthDateTime } from "ethiopian-calendar-date-converter";

export const ADDIS_ABABA_TIME_ZONE = "Africa/Addis_Ababa";

export const ETHIOPIAN_MONTH_NAMES = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
] as const;

export const ETHIOPIAN_WEEKDAY_HEADERS = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"] as const;

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
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

export function addisToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ADDIS_ABABA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return canonicalDate(part("year"), part("month"), part("day"));
}

/** Date-only conversion at noon UTC prevents a device timezone from changing the chosen day. */
export function toEthiopianDate(value: string): EthiopianDate | null {
  const date = parseCanonicalDate(value);
  if (!date) return null;
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
  if (month < 1 || month > 13 || day < 1 || day > monthLength(year, month)) {
    throw new Error("Invalid Ethiopian date");
  }

  /**
   * The converter's `toEuropeanDate` depends on non-ISO Date parsing, which Hermes
   * handles differently from browsers. Use a date-only epoch calculation here so
   * the same Ethiopian day always produces the same Gregorian API value.
   */
  const anchorEthiopianIndex = ethiopianDayIndex(2018, 1, 1);
  const targetIndex = ethiopianDayIndex(year, month, day);
  const converted = new Date(Date.UTC(2025, 8, 11, 12));
  converted.setUTCDate(converted.getUTCDate() + targetIndex - anchorEthiopianIndex);
  return canonicalDate(
    converted.getUTCFullYear(),
    converted.getUTCMonth() + 1,
    converted.getUTCDate(),
  );
}

function monthLength(year: number, month: number): number {
  if (month !== 13) return 30;
  return year % 4 === 3 ? 6 : 5;
}

function ethiopianDayIndex(year: number, month: number, day: number): number {
  return 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + (day - 1);
}

export function getEthiopianMonth(year: number, month: number): EthiopianMonthDay[] {
  const today = addisToday();
  return Array.from({ length: monthLength(year, month) }, (_, index) => {
    const day = index + 1;
    const gregorianDate = toGregorianDate(year, month, day);
    return {
      ethiopian: { year, month, day, monthName: ETHIOPIAN_MONTH_NAMES[month - 1] ?? "" },
      gregorianDate,
      weekday: new Date(`${gregorianDate}T12:00:00.000Z`).getUTCDay(),
      isToday: gregorianDate === today,
    };
  });
}

export function formatEthiopianDate(value: string): string | null {
  const date = toEthiopianDate(value);
  return date ? `${date.day} ${date.monthName} ${date.year}` : null;
}
