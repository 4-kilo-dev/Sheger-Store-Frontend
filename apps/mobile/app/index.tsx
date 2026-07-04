import { Redirect } from "expo-router";
import { to } from "@/utils/routes";

export default function IndexRoute() {
  return <Redirect href={to("/login")} />;
}
