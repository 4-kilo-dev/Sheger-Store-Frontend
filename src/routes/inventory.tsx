import { createFileRoute } from "@tanstack/react-router";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";

export const Route = createFileRoute("/inventory")({
  component: InventoryLayout
});
