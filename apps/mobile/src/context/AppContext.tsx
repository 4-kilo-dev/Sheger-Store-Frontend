import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PROFILES } from "@/data/mock";
import type { Profile } from "@/types/domain";

interface AppContextValue {
  activeProfile: Profile;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile>(PROFILES[0]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const value = useMemo(
    () => ({
      activeProfile,
      setActiveProfile,
      profiles: PROFILES,
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [activeProfile, theme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
