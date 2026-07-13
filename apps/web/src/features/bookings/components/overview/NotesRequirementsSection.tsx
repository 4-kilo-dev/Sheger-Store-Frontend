import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { getCustomFieldDefinitionsApi } from "@/features/bookings/services/bookings.api";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

export function NotesRequirementsSection({ b }: OverviewSectionProps) {
  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });

  return (
    <Section title="Notes & Special Requirements" icon={MessageSquare}>
      <div className="space-y-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] block mb-1">
            CTO Consultation Notes
          </span>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {b.ctoNotes ||
              "No special requirements noted. Coordinate with venue AV for power distribution."}
          </p>
        </div>
        {customFieldDefs
          .filter((def) => def.key === "technician_notes")
          .map((def) => {
            const val = b.customFields?.[def.key];
            if (!val) return null;
            return (
              <div key={def.id} className="border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] block mb-1">
                  {def.name}
                </span>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {val}
                </p>
              </div>
            );
          })}
      </div>
    </Section>
  );
}
