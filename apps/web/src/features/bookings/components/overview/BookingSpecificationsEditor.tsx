import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import {
  getCustomFieldDefinitionsApi,
  updateBookingApi,
} from "@/features/bookings/services/bookings.api";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

export function BookingSpecificationsEditor({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const isFieldPath = !caps.showOpsSidebar;

  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });
  const [customFieldsEdits, setCustomFieldsEdits] = useState<Record<string, any>>(
    b.customFields || {}
  );
  const [isSavingTechNotes, setIsSavingTechNotes] = useState(false);

  useEffect(() => {
    setCustomFieldsEdits(b.customFields || {});
  }, [b]);

  const handleSaveTechNotes = async () => {
    setIsSavingTechNotes(true);
    try {
      await updateBookingApi(b.id, { customFields: customFieldsEdits });
      toast.success("Technician job details and notes saved!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save technician notes");
    } finally {
      setIsSavingTechNotes(false);
    }
  };

  return (
    <Section
      title={
        isFieldPath ? "Technician Setup Details & Field Notes" : "Booking Specifications & Notes"
      }
      icon={MessageSquare}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {customFieldDefs.map((def) => {
            const value =
              customFieldsEdits[def.key] ??
              (def.type === "boolean" ? false : def.type === "multi_select" ? [] : "");

            if (
              def.key === "technician_notes" ||
              (def.type === "string" && def.key.includes("notes"))
            ) {
              return null;
            }

            const labelContent = (
              <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-2)" }}>
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
                    className="h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                ) : def.type === "enum" ? (
                  <select
                    value={value}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                    }
                    className="h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
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
                    className="flex flex-wrap gap-2 mt-1 p-2 rounded border bg-[var(--surface-2)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {def.options?.map((opt) => {
                      const arr = Array.isArray(value) ? value : [];
                      const checked = arr.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const nextArr = checked
                                ? arr.filter((x) => x !== opt)
                                : [...arr, opt];
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
                    className="h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
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
                    className="h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setCustomFieldsEdits((prev) => ({ ...prev, [def.key]: e.target.value }))
                    }
                    className="h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
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
              (def.type === "string" && def.key.includes("notes"))
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
                  className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            );
          })}

        <div className="flex justify-end">
          <button
            onClick={handleSaveTechNotes}
            disabled={isSavingTechNotes}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isSavingTechNotes
              ? "Saving..."
              : isFieldPath
                ? "Save Technical Notes"
                : "Save Specifications"}
          </button>
        </div>
      </div>
    </Section>
  );
}
