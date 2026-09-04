import { client } from "@/lib/api/client";

/** Avoid a request storm when the web release arrives before the calendar API. */
export const calendarQueryOptions = {
  retry: false,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
} as const;

export class CalendarServiceUnavailableError extends Error {
  constructor() {
    super("The calendar service is temporarily unavailable.");
  }
}

let unavailableUntil = 0;

async function calendarRequest<T>(request: () => Promise<T>): Promise<T> {
  if (Date.now() < unavailableUntil) throw new CalendarServiceUnavailableError();
  try {
    return await request();
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 404) {
      // A version-skewed deployment needs a refresh after the API is updated, not retries per cell.
      unavailableUntil = Date.now() + 60_000;
    }
    throw error;
  }
}

export type BackendCalendarSystem = "ethiopic" | "gregorian";
export type BackendNumeralsSystem = "latn" | "geez";

export interface EthiopianTimeValue {
  hour24: number;
  minute: number;
  isoTime: string;
  ethiopianHour: number;
  clockPeriod: "day" | "night";
  dayPeriod: "LELIT" | "TEWAT" | "KESEAT" | "MATA";
  dayPeriodLabel: string;
  display: string;
}

export interface EthiopianTimeOptions {
  minutes: number[];
  periods: Array<{
    id: EthiopianTimeValue["dayPeriod"];
    label: string;
    hours: number[];
  }>;
}

export interface CalendarFormatEntry {
  value: string;
  displayDate: string;
  displayDateTime: string;
  date: {
    iso: string;
    ethiopian: {
      year: number;
      month: number;
      day: number;
      monthName: string;
      display: string;
      time: EthiopianTimeValue;
    };
  };
}

export interface EthiopianMonthGrid {
  year: number;
  month: number;
  monthName: string;
  headers: string[];
  previous: { year: number; month: number };
  next: { year: number; month: number };
  days: Array<{
    ethiopian: { year: number; month: number; day: number; display: string };
    gregorian: { year: number; month: number; day: number; display: string; iso: string };
    weekday: number;
    isToday: boolean;
  }>;
}

export async function formatCalendarValuesApi(
  values: string[],
  calendar: BackendCalendarSystem,
  numerals: BackendNumeralsSystem,
): Promise<CalendarFormatEntry[]> {
  const result = await calendarRequest(() => client.post<{ entries: CalendarFormatEntry[] }>("/api/calendar/format", {
    values,
    calendar,
    numerals,
  }));
  return result.entries;
}

export function getEthiopianMonthApi(
  year: number,
  month: number,
  numerals: BackendNumeralsSystem,
) {
  return calendarRequest(() => client.get<EthiopianMonthGrid>(
    `/api/calendar/ethiopian/month?year=${year}&month=${month}&numerals=${numerals}`,
  ));
}

export function getCalendarNowApi() {
  return calendarRequest(() => client.get<CalendarFormatEntry["date"] & {
    gregorianDate: string;
    previousEthiopianMonth: { year: number; month: number };
  }>("/api/calendar/now"));
}

export function getEthiopianTimeApi(value: string) {
  return calendarRequest(() => client.get<EthiopianTimeValue>(`/api/calendar/ethiopian/time?value=${encodeURIComponent(value)}`));
}

export function getEthiopianTimeOptionsApi() {
  return calendarRequest(() => client.get<EthiopianTimeOptions>("/api/calendar/ethiopian/time/options"));
}

export function toGregorianTimeApi(
  dayPeriod: EthiopianTimeValue["dayPeriod"],
  ethiopianHour: number,
  minute: number,
) {
  return calendarRequest(() => client.post<EthiopianTimeValue>("/api/calendar/ethiopian/time/to-gregorian", {
    dayPeriod,
    ethiopianHour,
    minute,
  }));
}
