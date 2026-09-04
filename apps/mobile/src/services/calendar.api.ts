import { client } from "@/lib/api/client";

let unavailableUntil = 0;

async function calendarRequest<T>(request: () => Promise<T>): Promise<T> {
  if (Date.now() < unavailableUntil) throw new Error("The calendar service is temporarily unavailable.");
  try {
    return await request();
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 404) {
      unavailableUntil = Date.now() + 60_000;
    }
    throw error;
  }
}

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
  const result = await calendarRequest(() => client.post<{ entries: CalendarFormatEntry[] }>("/api/calendar/format", {
    values,
    calendar,
    numerals,
  }));
  return result.entries;
}

export function getCalendarNowApi() {
  return calendarRequest(() => client.get<CalendarNow>("/api/calendar/now"));
}
