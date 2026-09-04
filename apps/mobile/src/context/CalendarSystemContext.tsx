import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAppContext } from "@/context/AppContext";
import { getSettingsApi, updateSettingsApi } from "@/services/settings.api";
import { formatCalendarValuesApi, type CalendarFormatEntry } from "@/services/calendar.api";

export type CalendarSystem = "gregorian" | "ethiopic";
export type NumeralsSystem = "geez" | "latn";

interface CalendarSystemContextType {
  calendarSystem: CalendarSystem;
  numeralsSystem: NumeralsSystem;
  commitSettings: (system: CalendarSystem, numerals: NumeralsSystem) => Promise<void>;
  isLoadingSettings: boolean;
}

const CalendarSystemContext = createContext<CalendarSystemContextType | undefined>(undefined);

const CALENDAR_KEY = "vortex-calendar-system";
const NUMERALS_KEY = "vortex-numerals-system";

export function CalendarSystemProvider({ children }: { children: React.ReactNode }) {
  const { authUser, isAuthenticated } = useAppContext();
  const [calendarSystem, setCalendarSystemState] = useState<CalendarSystem>("gregorian");
  const [numeralsSystem, setNumeralsSystemState] = useState<NumeralsSystem>("latn");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        if (isAuthenticated) {
          const settings = await getSettingsApi();
          if (cancelled) return;
          if (settings.calendarSystem === "gregorian" || settings.calendarSystem === "ethiopic") {
            setCalendarSystemState(settings.calendarSystem);
          } else if (settings.calendar === "gregorian" || settings.calendar === "ethiopic") {
            setCalendarSystemState(settings.calendar as CalendarSystem);
          }
          if (settings.numeralsSystem === "geez" || settings.numeralsSystem === "latn") {
            setNumeralsSystemState(settings.numeralsSystem);
          }
        } else {
          const savedSystem = (await SecureStore.getItemAsync(
            CALENDAR_KEY,
          )) as CalendarSystem | null;
          const savedNumerals = (await SecureStore.getItemAsync(
            NUMERALS_KEY,
          )) as NumeralsSystem | null;
          if (cancelled) return;
          if (savedSystem === "gregorian" || savedSystem === "ethiopic") {
            setCalendarSystemState(savedSystem);
          }
          if (savedNumerals === "geez" || savedNumerals === "latn") {
            setNumeralsSystemState(savedNumerals);
          }
        }
      } catch {
        try {
          const savedSystem = (await SecureStore.getItemAsync(
            CALENDAR_KEY,
          )) as CalendarSystem | null;
          const savedNumerals = (await SecureStore.getItemAsync(
            NUMERALS_KEY,
          )) as NumeralsSystem | null;
          if (cancelled) return;
          if (savedSystem === "gregorian" || savedSystem === "ethiopic") {
            setCalendarSystemState(savedSystem);
          }
          if (savedNumerals === "geez" || savedNumerals === "latn") {
            setNumeralsSystemState(savedNumerals);
          }
        } catch {
          // keep defaults
        }
      } finally {
        if (!cancelled) setIsLoadingSettings(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, isAuthenticated]);

  const commitSettings = useCallback(async (system: CalendarSystem, numerals: NumeralsSystem) => {
    await updateSettingsApi({
      calendarSystem: system,
      numeralsSystem: numerals,
      calendar: system,
    });
    setCalendarSystemState(system);
    setNumeralsSystemState(numerals);
    await SecureStore.setItemAsync(CALENDAR_KEY, system);
    await SecureStore.setItemAsync(NUMERALS_KEY, numerals);
  }, []);

  return (
    <CalendarSystemContext.Provider
      value={{
        calendarSystem,
        numeralsSystem,
        commitSettings,
        isLoadingSettings,
      }}
    >
      {children}
    </CalendarSystemContext.Provider>
  );
}

export function useCalendarSystem() {
  const context = useContext(CalendarSystemContext);
  if (!context) {
    throw new Error("useCalendarSystem must be used within a CalendarSystemProvider");
  }
  return context;
}

export function useDateFormatter() {
  const { calendarSystem, numeralsSystem } = useCalendarSystem();
  const [cache, setCache] = useState<Record<string, CalendarFormatEntry>>({});
  const [, setFailureVersion] = useState(0);
  const pending = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const flushScheduled = useRef(false);

  useEffect(() => {
    setCache({});
    pending.current.clear();
    failed.current.clear();
  }, [calendarSystem, numeralsSystem]);

  const request = useCallback((value: string | Date) => {
    const normalized = value instanceof Date ? value.toISOString() : value;
    if (Number.isNaN(new Date(normalized).getTime()) || failed.current.has(normalized)) return null;
    const key = `${calendarSystem}:${numeralsSystem}:${normalized}`;
    if (cache[key]) return cache[key];
    pending.current.add(normalized);
    if (!flushScheduled.current) {
      flushScheduled.current = true;
      Promise.resolve().then(async () => {
        const values = [...pending.current];
        pending.current.clear();
        flushScheduled.current = false;
        try {
          const entries = await formatCalendarValuesApi(values, calendarSystem, numeralsSystem);
          setCache((current) => ({
            ...current,
            ...Object.fromEntries(entries.map((entry) => [
              `${calendarSystem}:${numeralsSystem}:${entry.value}`,
              entry,
            ])),
          }));
        } catch {
          values.forEach((item) => failed.current.add(item));
          setFailureVersion((version) => version + 1);
        }
      });
    }
    return null;
  }, [cache, calendarSystem, numeralsSystem]);

  const formatDate = useCallback(
    (dateInput?: string | Date | null) => {
      if (!dateInput) return "—";
      const normalized = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
      return request(dateInput)?.displayDate || (failed.current.has(normalized) ? "Calendar unavailable" : "…");
    },
    [request],
  );

  const formatDateTime = useCallback(
    (dateInput?: string | Date | null) => {
      if (!dateInput) return "—";
      const normalized = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
      return request(dateInput)?.displayDateTime || (failed.current.has(normalized) ? "Calendar unavailable" : "…");
    },
    [request],
  );

  return { formatDate, formatDateTime, calendarSystem, numeralsSystem };
}
