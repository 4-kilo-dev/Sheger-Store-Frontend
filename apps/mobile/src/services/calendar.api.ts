import { client } from "@/lib/api/client";

type CalendarSystem = "ethiopic" | "gregorian";
type NumeralsSystem = "latn" | "geez";

export type CalendarFormatEntry = {
  value: string;
  displayDate: string;
  displayDateTime: string;
};

export type CalendarNow = {
  gregorianDate: string;
  ethiopian: { year: number; month: number };
  previousEthiopianMonth: { year: number; month: number };
};

export async function formatCalendarValuesApi(
  values: string[],
  calendar: CalendarSystem,
  numerals: NumeralsSystem,
) {
  const result = await client.post<{ entries: CalendarFormatEntry[] }>("/api/calendar/format", {
    values,
    calendar,
    numerals,
  });
  return result.entries;
}

export function getCalendarNowApi() {
  return client.get<CalendarNow>("/api/calendar/now");
}
