import { Redirect } from "expo-router";
import { View } from "react-native";
import { to } from "@/utils/routes";
import { AppShell } from "@/components/AppShell";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/theme/tokens";

export default function OperationsLayout() {
  const { isAuthenticated, isRestoringSession, mustChangePassword } = useAppContext();
  if (isRestoringSession) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!isAuthenticated) return <Redirect href={to("/login")} />;
  if (mustChangePassword) return <Redirect href={to("/change-password")} />;
  return <AppShell />;
}
