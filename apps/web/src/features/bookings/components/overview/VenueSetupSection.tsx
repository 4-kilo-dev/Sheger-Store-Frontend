import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { getCustomFieldDefinitionsApi } from "@/features/bookings/services/bookings.api";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { OverviewSectionProps } from "./types";

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function VenueSetupSection({ b }: OverviewSectionProps) {
  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });

  return (
    <Section title="Venue & Setup" icon={MapPin}>
      <div className="grid grid-cols-2 gap-x-6">
        <KV label="Venue" value={displayValue(b.venue)} />
        <KV label="Requested Size (sqm)" value={b.size > 0 ? b.size : "—"} mono />
        <KV label="Screen Type" value={displayValue(b.screenType)} mono />
        <KV label="Arrangement" value={displayValue(b.arrangement)} mono />
        <div className="col-span-2">
          <KV label="Intake / Technical Spec" value={displayValue(b.itemServiceSpec)} />
        </div>
        {customFieldDefs
          .filter((def) => def.key !== "technician_notes")
          .map((def) => {
            const val = b.customFields?.[def.key];
            if (val === undefined || val === null || val === "") return null;
            let displayVal = val;
            if (def.type === "multi_select" && Array.isArray(val)) {
              displayVal = val.join(", ");
            } else if (def.type === "boolean") {
              displayVal = val ? "Yes" : "No";
            }
            return <KV key={def.id} label={def.name} value={String(displayVal)} />;
          })}
      </div>
    </Section>
  );
}
