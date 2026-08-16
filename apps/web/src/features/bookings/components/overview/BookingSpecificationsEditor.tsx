import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import {
  getCustomFieldDefinitionsApi,
  updateBookingApi,
} from "@/features/bookings/services/bookings.api";
import { DatePicker } from "@/components/ui/date-picker";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

type CoreEdits = {
  venue: string;
  arrangement: string;
  size: string;
  rentedDays: string;
  itemServiceSpec: string;
  assemblyDate: string;
  eventDate: string;
  dismantleDate: string;
};

function toInputDateTime(value?: string): string {
  if (!value) return "";
  // Booking mapper already normalizes to local YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toIsoOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const fieldClass =
  "h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--accent)]";
const labelClass = "text-[11px] font-semibold block mb-1";

export function BookingSpecificationsEditor({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const isFieldPath = !caps.showOpsSidebar;
  /** Admins / CCR with booking.edit can change core booking fields at any stage. */
  const canFullyEdit = caps.canEditLogistics;

  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });
  const [customFieldsEdits, setCustomFieldsEdits] = useState<Record<string, any>>(
    b.customFields || {},
  );
  const [core, setCore] = useState<CoreEdits>({
    venue: b.venue || "",
    arrangement: b.arrangement || "",
    size: b.size > 0 ? String(b.size) : "",
    rentedDays: b.rentedDays != null && b.rentedDays > 0 ? String(b.rentedDays) : "",
    itemServiceSpec: b.itemServiceSpec || "",
    assemblyDate: toInputDateTime(b.assemblyDate),
    eventDate: toInputDateTime(b.eventDate),
    dismantleDate: toInputDateTime(b.dismantleDate),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCustomFieldsEdits(b.customFields || {});
    setCore({
      venue: b.venue || "",
      arrangement: b.arrangement || "",
      size: b.size > 0 ? String(b.size) : "",
      rentedDays: b.rentedDays != null && b.rentedDays > 0 ? String(b.rentedDays) : "",
      itemServiceSpec: b.itemServiceSpec || "",
      assemblyDate: toInputDateTime(b.assemblyDate),
      eventDate: toInputDateTime(b.eventDate),
      dismantleDate: toInputDateTime(b.dismantleDate),
    });
  }, [b]);

  const setCoreField = (key: keyof CoreEdits, value: string) => {
    setCore((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        customFields: customFieldsEdits,
      };

      if (canFullyEdit) {
        payload.eventLocation = core.venue.trim() || undefined;
        payload.arrangementDetails = core.arrangement.trim() || undefined;
        payload.itemServiceSpec = core.itemServiceSpec.trim() || undefined;

        const sizeNum = parseFloat(core.size);
        if (Number.isFinite(sizeNum) && sizeNum >= 0) {
          payload.screenAreaSqm = String(sizeNum);
        }

        const daysNum = parseInt(core.rentedDays, 10);
        if (Number.isFinite(daysNum) && daysNum > 0) {
          payload.rentedDays = daysNum;
        }

        const assemblyIso = toIsoOrUndefined(core.assemblyDate);
        const eventIso = toIsoOrUndefined(core.eventDate);
        const dismantleIso = toIsoOrUndefined(core.dismantleDate);

        if (assemblyIso) {
          payload.assemblyStart = assemblyIso;
          payload.deliveryDate = assemblyIso;
        }
        if (eventIso) {
          payload.eventDate = eventIso;
          payload.rentalStart = eventIso;
        }
        if (dismantleIso) {
          payload.disassemblyStart = dismantleIso;
          payload.disassemblyEnd = dismantleIso;
          payload.rentalEnd = dismantleIso;
        }
      }

      await updateBookingApi(b.id, payload);
      toast.success(
        canFullyEdit ? "Booking details saved" : "Technician job details and notes saved!",
      );
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save booking details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Section
      title={
        isFieldPath
          ? "Technician Setup Details & Field Notes"
          : canFullyEdit
            ? "Booking Details & Specifications"
            : "Booking Specifications & Notes"
      }
      icon={MessageSquare}
    >
      <div className="space-y-4">
        {canFullyEdit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block md:col-span-2">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Venue / Location
                </span>
                <input
                  type="text"
                  value={core.venue}
                  onChange={(e) => setCoreField("venue", e.target.value)}
                  className={fieldClass}
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Requested Size (sqm)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={core.size}
                  onChange={(e) => setCoreField("size", e.target.value)}
                  className={fieldClass}
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Arrangement
                </span>
                <input
                  type="text"
                  value={core.arrangement}
                  onChange={(e) => setCoreField("arrangement", e.target.value)}
                  placeholder="e.g. hanging (4wx3h)"
                  className={fieldClass}
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Rented Days
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={core.rentedDays}
                  onChange={(e) => setCoreField("rentedDays", e.target.value)}
                  className={fieldClass}
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="block md:col-span-3">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Intake / Technical Spec
                </span>
                <input
                  type="text"
                  value={core.itemServiceSpec}
                  onChange={(e) => setCoreField("itemServiceSpec", e.target.value)}
                  className={fieldClass}
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Assembly Date & Time
                </span>
                <DatePicker
                  value={core.assemblyDate}
                  onChange={(v) => setCoreField("assemblyDate", v)}
                  showTime
                  className="mt-0"
                />
              </label>
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Event Date & Time
                </span>
                <DatePicker
                  value={core.eventDate}
                  onChange={(v) => setCoreField("eventDate", v)}
                  showTime
                  className="mt-0"
                />
              </label>
              <label className="block">
                <span className={labelClass} style={{ color: "var(--text-2)" }}>
                  Dismantle Date & Time
                </span>
                <DatePicker
                  value={core.dismantleDate}
                  onChange={(v) => setCoreField("dismantleDate", v)}
                  showTime
                  className="mt-0"
                />
              </label>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {customFieldDefs.map((def) => {
            const rawVal = customFieldsEdits[def.key];
            const value =
              rawVal ??
              (def.type === "boolean" ? false : def.type === "multi_select" ? [] : "");

            if (
              def.key === "technician_notes" ||
              (def.type === "string" && def.key.includes("notes"))
            ) {
              return null;
            }

            const labelContent = (
              <span className={labelClass} style={{ color: "var(--text-2)" }}>
                {def.name} {def.required && <span className="text-red-500">*</span>}
              </span>
            );

            return (
              <label key={def.id} className="block">
                {labelContent}
                {def.type === "boolean" ? (
                  <select
                    value={value ? "true" : "false"}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({
                        ...prev,
                        [def.key]: e.target.value === "true",
                      }))
                    }
                    className={fieldClass}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                ) : def.type === "enum" ? (
                  <select
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                    }
                    className={fieldClass}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="">-- Select --</option>
                    {def.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : def.type === "multi_select" ? (
                  <div
                    className="flex flex-wrap gap-2 mt-1 p-2 rounded border bg-[var(--surface)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {def.options?.map((opt) => {
                      const selectedValues = Array.isArray(rawVal)
                        ? rawVal
                        : typeof rawVal === "string" && rawVal
                        ? [rawVal]
                        : [];
                      const checked = selectedValues.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const nextArr = checked
                                ? selectedValues.filter((x) => x !== opt)
                                : [...selectedValues, opt];
                              setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: nextArr }));
                            }}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : def.type === "date" ? (
                  <input
                    type="date"
                    value={value ? String(value).slice(0, 10) : ""}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                    }
                    className={fieldClass}
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : def.type === "number" ? (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({
                        ...prev,
                        [def.key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={fieldClass}
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                    }
                    className={fieldClass}
                    style={{ borderColor: "var(--border)" }}
                  />
                )}
              </label>
            );
          })}
        </div>

        {customFieldDefs
          .filter(
            (def) =>
              def.key === "technician_notes" ||
              (def.type === "string" && def.key.includes("notes")),
          )
          .map((def) => {
            const value = customFieldsEdits[def.key] ?? "";
            return (
              <label
                key={def.id}
                className="text-[11px] font-semibold block mt-3"
                style={{ color: "var(--text-2)" }}
              >
                {def.name} {def.required && <span className="text-red-500">*</span>}
                <textarea
                  value={value}
                  onChange={(e) =>
                    setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                  }
                  placeholder={`Provide details for ${def.name}...`}
                  className="mt-1 w-full rounded border bg-[var(--surface)] p-2.5 text-[12px] h-24 block resize-none outline-none focus:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            );
          })}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isSaving
              ? "Saving..."
              : isFieldPath
                ? "Save Technical Notes"
                : canFullyEdit
                  ? "Save Booking Details"
                  : "Save Specifications"}
          </button>
        </div>
      </div>
    </Section>
  );
}
