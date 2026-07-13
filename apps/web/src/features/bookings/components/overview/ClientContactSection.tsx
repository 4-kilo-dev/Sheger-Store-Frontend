import { Phone, User } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { OverviewSectionProps } from "./types";

export function ClientContactSection({ b }: OverviewSectionProps) {
  return (
    <Section title="Client & Contact" icon={User}>
      <div className="grid grid-cols-2 gap-x-6">
        <KV label="Client" value={b.client} />
        <KV label="Contact Person" value={b.contactPerson} />
        <KV
          label="Phone"
          value={
            <span className="flex items-center justify-end gap-1.5">
              <Phone className="h-3 w-3" />
              {b.contactPhone}
            </span>
          }
          mono
        />
        <KV label="Booking Code" value={b.code} mono />
      </div>
    </Section>
  );
}
