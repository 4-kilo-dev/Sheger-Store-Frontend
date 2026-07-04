import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PROFILES } from "@/data/mock";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { authService } from "@/services/auth-service";
import type { Profile } from "@/types/domain";

interface AppContextValue {
  activeProfile: Profile;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  theme: "dark" | "light";
  toggleTheme: () => void;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  changePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile>(PROFILES[0]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const clearSession = () => {
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setActiveProfile(PROFILES[0]);
    };
    setUnauthorizedHandler(clearSession);

    authService
      .restoreSession()
      .then((session) => {
        if (session) {
          setActiveProfile(session.profile);
          setIsAuthenticated(true);
        }
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  const value = useMemo(
    () => ({
      activeProfile,
      setActiveProfile,
      profiles: PROFILES,
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      isAuthenticated,
      isRestoringSession,
      mustChangePassword,
      login: async (email: string, password: string) => {
        const session = await authService.login(email, password);
        setActiveProfile(session.profile);
        setMustChangePassword(session.mustChangePassword);
        setIsAuthenticated(true);
        return { mustChangePassword: session.mustChangePassword };
      },
      changePassword: async (password: string) => {
        await authService.changePassword(password);
        setMustChangePassword(false);
      },
      logout: async () => {
        await authService.logout();
        setIsAuthenticated(false);
        setMustChangePassword(false);
        setActiveProfile(PROFILES[0]);
      },
    }),
    [activeProfile, theme, isAuthenticated, isRestoringSession, mustChangePassword],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
