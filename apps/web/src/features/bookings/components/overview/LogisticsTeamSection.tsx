import { Truck } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { OverviewSectionProps } from "./types";

export function LogisticsTeamSection({ b }: OverviewSectionProps) {
  return (
    <Section title="Logistics & Team" icon={Truck}>
      <div className="grid grid-cols-2 gap-x-6">
        <KV label="Team Leader" value={b.teamLeader} />
        <KV label="Stage Hand" value={b.stageHand} />
        <KV label="Driver" value={b.driver} />
        <KV label="Meal Budget" value={`ETB ${b.mealBudget.toLocaleString()}`} mono />
      </div>
    </Section>
  );
}
