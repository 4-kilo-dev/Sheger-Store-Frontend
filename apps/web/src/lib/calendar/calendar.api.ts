import { client } from "@/lib/api/client";

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
  const result = await client.post<{ entries: CalendarFormatEntry[] }>("/api/calendar/format", {
    values,
    calendar,
    numerals,
  });
  return result.entries;
}

export function getEthiopianMonthApi(
  year: number,
  month: number,
  numerals: BackendNumeralsSystem,
) {
  return client.get<EthiopianMonthGrid>(
    `/api/calendar/ethiopian/month?year=${year}&month=${month}&numerals=${numerals}`,
  );
}

export function getCalendarNowApi() {
  return client.get<CalendarFormatEntry["date"] & {
    gregorianDate: string;
    previousEthiopianMonth: { year: number; month: number };
  }>("/api/calendar/now");
}

export function getEthiopianTimeApi(value: string) {
  return client.get<EthiopianTimeValue>(`/api/calendar/ethiopian/time?value=${encodeURIComponent(value)}`);
}

export function getEthiopianTimeOptionsApi() {
  return client.get<EthiopianTimeOptions>("/api/calendar/ethiopian/time/options");
}

export function toGregorianTimeApi(
  dayPeriod: EthiopianTimeValue["dayPeriod"],
  ethiopianHour: number,
  minute: number,
) {
  return client.post<EthiopianTimeValue>("/api/calendar/ethiopian/time/to-gregorian", {
    dayPeriod,
    ethiopianHour,
    minute,
  });
}
