import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, User } from "lucide-react";
import { updateBookingCustomerApi } from "@/features/bookings/services/bookings.api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { OverviewSectionProps } from "./types";

const fieldClass =
  "mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] outline-none focus:border-[var(--accent)] disabled:opacity-75 disabled:cursor-not-allowed";

export function ClientContactSection({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const canEdit =
    !caps.isBookingUpdateLocked &&
    !!b.customerId &&
    (caps.canManageCustomer || b.createdBy === authUser?.id);

  const [client, setClient] = useState(b.client || "");
  const [contactPerson, setContactPerson] = useState(b.contactPerson || "");
  const [phone, setPhone] = useState(b.contactPhone || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setClient(b.client || "");
    setContactPerson(b.contactPerson || "");
    setPhone(b.contactPhone || "");
  }, [b.client, b.contactPerson, b.contactPhone]);

  const dirty =
    client.trim() !== (b.client || "").trim() ||
    contactPerson.trim() !== (b.contactPerson || "").trim() ||
    phone.trim() !== (b.contactPhone || "").trim();

  const handleSave = async () => {
    if (!b.customerId) {
      toast.error("This booking has no linked customer record.");
      return;
    }
    if (!client.trim()) {
      toast.error("Client name is required.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBookingCustomerApi(b.id, {
        name: client.trim(),
        phone: phone.trim(),
        notes: contactPerson.trim() || client.trim(),
      });
      toast.success("Client & contact saved");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save client details");
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
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

  return (
    <Section title="Client & Contact" icon={User}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Client
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. Sheraton Addis"
              className={fieldClass}
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Contact Person
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full name"
              className={fieldClass}
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09…"
              className={`${fieldClass} font-mono`}
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <div className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
            Booking Code
            <div className="mt-1 h-9 flex items-center font-mono text-[12px] font-medium">
              {b.code}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!dirty || isSaving}
            onClick={handleSave}
            className="h-9 rounded px-4 text-[12px] font-bold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground, #111)" }}
          >
            {isSaving ? "Saving…" : "Save Client Info"}
          </button>
        </div>
      </div>
    </Section>
  );
}
