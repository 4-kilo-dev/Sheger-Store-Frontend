import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PROFILES } from "@/data/mock";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { authService } from "@/services/auth-service";
import type { AuthUser, Profile } from "@/types/domain";

const THEME_KEY = "vortex_theme";

interface AppContextValue {
  activeProfile: Profile;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  authUser: AuthUser | null;
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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const clearSession = () => {
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setActiveProfile(PROFILES[0]);
      setAuthUser(null);
    };
    setUnauthorizedHandler(clearSession);

    SecureStore.getItemAsync(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });

    authService
      .restoreSession()
      .then((session) => {
        if (session) {
          setActiveProfile(session.profile);
          setAuthUser(session.authUser);
          setMustChangePassword(session.mustChangePassword);
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
      authUser,
      theme,
      toggleTheme: () => {
        setTheme((current) => {
          const next = current === "dark" ? "light" : "dark";
          SecureStore.setItemAsync(THEME_KEY, next);
          return next;
        });
      },
      isAuthenticated,
      isRestoringSession,
      mustChangePassword,
      login: async (email: string, password: string) => {
        const session = await authService.login(email, password);
        setActiveProfile(session.profile);
        setAuthUser(session.authUser);
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
        setAuthUser(null);
      },
    }),
    [activeProfile, authUser, theme, isAuthenticated, isRestoringSession, mustChangePassword],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
