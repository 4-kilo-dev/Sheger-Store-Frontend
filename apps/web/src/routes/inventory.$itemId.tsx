import { createFileRoute } from "@tanstack/react-router";
import { InventoryDetail } from "@/features/inventory/pages/InventoryDetailPage";

export const Route = createFileRoute("/inventory/$itemId")({
  component: InventoryDetail
});
