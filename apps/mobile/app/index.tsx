import { Redirect } from "expo-router";
import { to } from "@/utils/routes";
import { useAppContext } from "@/context/AppContext";

export default function IndexRoute() {
  const { isAuthenticated, mustChangePassword } = useAppContext();
  if (!isAuthenticated) return <Redirect href={to("/login")} />;
  if (mustChangePassword) return <Redirect href={to("/change-password")} />;
  return <Redirect href={to("/dashboard")} />;
}
