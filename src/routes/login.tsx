import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/pages/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Vortex Visual" },
      { name: "description", content: "Secure sign in to the Vortex Visual operations platform." },
    ],
  }),
  component: LoginPage,
});