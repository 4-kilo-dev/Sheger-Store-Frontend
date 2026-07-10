import React, { createContext, useContext, useState, useEffect } from "react";
import { getSettingsApi, updateSettingsApi } from "@/features/settings/services/settings.api";
import { useAuthUser } from "@/hooks/use-auth-user";

export type CalendarSystem = "gregorian" | "ethiopic";
export type NumeralsSystem = "geez" | "latn";

interface CalendarSystemContextType {
  calendarSystem: CalendarSystem;
  numeralsSystem: NumeralsSystem;
  commitSettings: (system: CalendarSystem, numerals: NumeralsSystem) => Promise<void>;
  isLoadingSettings: boolean;
}

const CalendarSystemContext = createContext<CalendarSystemContextType | undefined>(undefined);

export function CalendarSystemProvider({ children }: { children: React.ReactNode }) {
  const authUser = useAuthUser();
  const [calendarSystem, setCalendarSystemState] = useState<CalendarSystem>("gregorian");
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

  const formatDate = React.useCallback((dateInput?: string | Date | null) => {
    if (!dateInput) return "—";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";

    if (calendarSystem === "ethiopic") {
      const locale = numeralsSystem === "geez" ? "am-ET-u-ca-ethiopic" : "am-ET-u-ca-ethiopic-nu-latn";
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(date);
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }, [calendarSystem, numeralsSystem]);

  const formatDateTime = React.useCallback((dateInput?: string | Date | null) => {
    if (!dateInput) return "—";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";

    if (calendarSystem === "ethiopic") {
      const locale = numeralsSystem === "geez" ? "am-ET-u-ca-ethiopic" : "am-ET-u-ca-ethiopic-nu-latn";
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }, [calendarSystem, numeralsSystem]);

  return { formatDate, formatDateTime };
}
