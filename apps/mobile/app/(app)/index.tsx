import { Redirect } from "expo-router";
import { to } from "@/utils/routes";

export default function AppIndexRoute() {
  return <Redirect href={to("/dashboard")} />;
}
