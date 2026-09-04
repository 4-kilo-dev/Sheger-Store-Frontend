import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSettingsApi, updateSettingsApi } from "@/features/settings/services/settings.api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatCalendarValuesApi, type CalendarFormatEntry } from "@/lib/calendar/calendar.api";

export type CalendarSystem = "gregorian" | "ethiopic";
export type NumeralsSystem = "geez" | "latn";

interface CalendarSystemContextType {
  calendarSystem: CalendarSystem;
  numeralsSystem: NumeralsSystem;
  commitSettings: (system: CalendarSystem, numerals: NumeralsSystem) => Promise<void>;
  isLoadingSettings: boolean;
}

const CalendarSystemContext = createContext<CalendarSystemContextType | undefined>(undefined);

function calendarValue(value: string | Date): string | null {
  const normalized = value instanceof Date ? value.toISOString() : value;
  return Number.isNaN(new Date(normalized).getTime()) ? null : normalized;
}

export function CalendarSystemProvider({ children }: { children: React.ReactNode }) {
  const authUser = useAuthUser();
  const [calendarSystem, setCalendarSystemState] = useState<CalendarSystem>("ethiopic");
  const [numeralsSystem, setNumeralsSystemState] = useState<NumeralsSystem>("latn");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSettingsApi();
        if (settings.calendarSystem === "gregorian" || settings.calendarSystem === "ethiopic") {
          setCalendarSystemState(settings.calendarSystem as CalendarSystem);
        }
        if (settings.numeralsSystem === "geez" || settings.numeralsSystem === "latn") {
          setNumeralsSystemState(settings.numeralsSystem as NumeralsSystem);
        }
      } catch (e) {
        // Fallback to local storage if API fails or user is not logged in yet
        try {
          const savedSystem = localStorage.getItem("vortex-calendar-system") as CalendarSystem;
          if (savedSystem === "gregorian" || savedSystem === "ethiopic") {
            setCalendarSystemState(savedSystem);
          }
          const savedNumerals = localStorage.getItem("vortex-numerals-system") as NumeralsSystem;
          if (savedNumerals === "geez" || savedNumerals === "latn") {
            setNumeralsSystemState(savedNumerals);
          }
        } catch (e2) {}
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, [authUser?.id]);

  const commitSettings = async (system: CalendarSystem, numerals: NumeralsSystem) => {
    // 1. Save to backend database
    await updateSettingsApi({
      calendarSystem: system,
      numeralsSystem: numerals,
    });
    // 2. Update reactive state
    setCalendarSystemState(system);
    setNumeralsSystemState(numerals);
    // 3. Keep local storage synced for fallback
    try {
      localStorage.setItem("vortex-calendar-system", system);
      localStorage.setItem("vortex-numerals-system", numerals);
    } catch (e) {}
  };

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
  const isFlushScheduled = useRef(false);

  useEffect(() => {
    // A preference change needs fresh labels from the backend calendar service.
    setCache({});
    pending.current.clear();
    failed.current.clear();
  }, [calendarSystem, numeralsSystem]);

  const request = useCallback((value: string | Date) => {
    const normalized = calendarValue(value);
    if (!normalized || typeof window === "undefined" || failed.current.has(normalized)) return null;
    const key = `${calendarSystem}:${numeralsSystem}:${normalized}`;
    if (cache[key]) return cache[key];
    pending.current.add(normalized);
    if (!isFlushScheduled.current) {
      isFlushScheduled.current = true;
      queueMicrotask(async () => {
        const values = [...pending.current];
        pending.current.clear();
        isFlushScheduled.current = false;
        if (values.length === 0) return;
        try {
          const entries = await formatCalendarValuesApi(values, calendarSystem, numeralsSystem);
          setCache((current) => {
            const next = { ...current };
            for (const entry of entries) {
              next[`${calendarSystem}:${numeralsSystem}:${entry.value}`] = entry;
            }
            return next;
          });
        } catch {
          values.forEach((item) => failed.current.add(item));
          setFailureVersion((version) => version + 1);
        }
      });
    }
    return null;
  }, [cache, calendarSystem, numeralsSystem]);

  const formatDate = React.useCallback((dateInput?: string | Date | null) => {
    if (!dateInput) return "—";
    const normalized = calendarValue(dateInput);
    return request(dateInput)?.displayDate ?? (normalized && failed.current.has(normalized) ? "Calendar unavailable" : "…");
  }, [request]);

  const formatDateTime = React.useCallback((dateInput?: string | Date | null) => {
    if (!dateInput) return "—";
    const normalized = calendarValue(dateInput);
    return request(dateInput)?.displayDateTime ?? (normalized && failed.current.has(normalized) ? "Calendar unavailable" : "…");
  }, [request]);

  return { formatDate, formatDateTime };
}
