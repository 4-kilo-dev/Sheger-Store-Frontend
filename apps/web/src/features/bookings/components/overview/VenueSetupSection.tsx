import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { getCustomFieldDefinitionsApi } from "@/features/bookings/services/bookings.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { OverviewSectionProps } from "./types";

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function VenueSetupSection({ b }: OverviewSectionProps) {
  const { formatDateTime } = useDateFormatter();
  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });

  return (
    <Section title="Booking Details & Specifications" icon={MapPin}>
      <div className="grid grid-cols-2 gap-x-6">
        <KV label="Venue" value={displayValue(b.venue)} />
        <KV label="Requested Size (sqm)" value={b.size > 0 ? b.size : "—"} mono />
        <KV label="Screen Type" value={displayValue(b.screenType)} mono />
        <KV label="Arrangement" value={displayValue(b.arrangement)} mono />
        <KV
          label="Rented Days"
          value={b.rentedDays != null && b.rentedDays > 0 ? b.rentedDays : "—"}
          mono
        />
        <div className="col-span-2">
          <KV label="Intake / Technical Spec" value={displayValue(b.itemServiceSpec)} />
        </div>
        <KV label="Assembly" value={b.assemblyDate ? formatDateTime(b.assemblyDate) : "—"} />
        <KV label="Event" value={b.eventDate ? formatDateTime(b.eventDate) : "—"} />
        <KV label="Dismantle" value={b.dismantleDate ? formatDateTime(b.dismantleDate) : "—"} />
        {customFieldDefs.map((def) => {
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
