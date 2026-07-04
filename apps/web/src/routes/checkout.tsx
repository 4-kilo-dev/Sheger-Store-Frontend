import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/features/checkout/pages/CheckoutPage";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage
});
