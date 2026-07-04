import { Redirect, Stack, usePathname } from "expo-router";
import { to } from "@/utils/routes";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/theme/tokens";

export default function AuthLayout() {
  const { isAuthenticated, mustChangePassword } = useAppContext();
  const pathname = usePathname();

  if (isAuthenticated && !mustChangePassword && pathname !== "/change-password") {
    return <Redirect href={to("/dashboard")} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
