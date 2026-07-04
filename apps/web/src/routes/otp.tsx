import { createFileRoute } from "@tanstack/react-router";
import { OtpPage } from "@/features/auth/pages/OtpPage";

export const Route = createFileRoute("/otp")({
  head: () => ({
    meta: [
      { title: "Verify code · Vortex Visual" },
      { name: "description", content: "Verify your secure Vortex Visual sign-in code." },
    ],
  }),
  component: OtpPage,
});