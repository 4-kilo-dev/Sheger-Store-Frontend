import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Change Password · Vortex Visual" },
      { name: "description", content: "Set your secure password for Vortex Visual." },
    ],
  }),
  component: ChangePasswordPage,
});
