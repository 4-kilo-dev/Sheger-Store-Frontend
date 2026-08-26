import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { formatEthiopianDateTimeClock } from "@vortex/utils";
import { useAppContext } from "@/context/AppContext";
import { getSettingsApi, updateSettingsApi } from "@/services/settings.api";

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

  const formatDate = useCallback(
    (dateInput?: string | Date | null) => {
      if (!dateInput) return "—";
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (Number.isNaN(date.getTime())) return "—";

      if (calendarSystem === "ethiopic") {
        const locale =
          numeralsSystem === "geez" ? "am-ET-u-ca-ethiopic" : "am-ET-u-ca-ethiopic-nu-latn";
        return new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);
      }

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    },
    [calendarSystem, numeralsSystem],
  );

  const formatDateTime = useCallback(
    (dateInput?: string | Date | null) => {
      if (!dateInput) return "—";
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (Number.isNaN(date.getTime())) return "—";

      if (calendarSystem === "ethiopic") {
        const locale =
          numeralsSystem === "geez" ? "am-ET-u-ca-ethiopic" : "am-ET-u-ca-ethiopic-nu-latn";
        const datePart = new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);
        const timePart = formatEthiopianDateTimeClock(
          date,
          numeralsSystem === "geez" ? "geez" : "latn",
        );
        return `${datePart} ${timePart}`;
      }

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [calendarSystem, numeralsSystem],
  );

  return { formatDate, formatDateTime, calendarSystem, numeralsSystem };
}
