import { createFileRoute } from "@tanstack/react-router";
import { StaffPage } from "@/features/users/pages/UsersPage";

export const Route = createFileRoute("/staff")({
  component: StaffPage
});
