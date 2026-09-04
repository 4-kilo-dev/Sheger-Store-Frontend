import "react-native-gesture-handler";
import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { CalendarSystemProvider } from "@/context/CalendarSystemContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { colors } from "@/theme/tokens";
import { useAppFonts } from "@/theme/fonts";
import { createMobileQueryClient } from "@/lib/query-client";

export default function RootLayout() {
  const [queryClient] = useState(() => createMobileQueryClient());
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <ThemedApp />
        </AppProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { theme } = useAppContext();

  return (
    <CalendarSystemProvider>
      <NotificationsProvider>
        <ErrorBoundary>
          <>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <Stack
              key={theme}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </>
        </ErrorBoundary>
      </NotificationsProvider>
    </CalendarSystemProvider>
  );
}
