import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/features/inventory/pages/InventoryListPage";

export const Route = createFileRoute("/inventory/")({
  component: InventoryPage
});
