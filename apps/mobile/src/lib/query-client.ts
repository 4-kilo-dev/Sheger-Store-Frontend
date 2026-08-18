import { AppState, Platform } from "react-native";
import { QueryClient, focusManager } from "@tanstack/react-query";

/**
 * Wire TanStack Query's focus manager to AppState so refetchOnWindowFocus
 * and refetchIntervalInBackground behave on native the same way they do on web.
 */
export function bindQueryFocusManager(): void {
  if (Platform.OS === "web") return;
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (state) => {
      handleFocus(state === "active");
    });
    return () => subscription.remove();
  });
}

export function createMobileQueryClient(): QueryClient {
  bindQueryFocusManager();
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnReconnect: true,
      },
    },
  });
}
