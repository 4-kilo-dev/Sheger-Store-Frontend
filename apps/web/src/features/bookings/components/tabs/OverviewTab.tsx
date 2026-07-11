import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import {
  Wrench,
  Users,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Truck,
  Paperclip,
  AlertCircle,
  RotateCcw,
  Package,
  User,
} from "lucide-react";
import { PaymentBadge } from "@/components/status-badge";
import {
  updateBookingApi,
  getBookingSnapshotsApi,
  createReservationApi,
  createAssignmentApi,
  getBookingReservationsApi,
  deleteReservationApi,
  deleteAssignmentApi,
  checkoutReverseApi,
  createBomLineApi,
  updateBomLineApi,
  deleteBomLineApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import {
  getInventoryCategoriesApi,
  getInventoryPoolsApi,
  getPoolAvailabilityApi,
} from "@/features/inventory/services/inventory.api";
import { getStaffApi } from "@/features/users/services/staff.api";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import { AccessLockOverlay } from "@/features/bookings/components/shared/AccessLockOverlay";
import { FileUploadZone } from "@/features/bookings/components/shared/FileUploadZone";
import { FileCard } from "@/features/bookings/components/shared/FileCard";
import { DeleteConfirmModal } from "@/features/bookings/components/shared/DeleteConfirmModal";
import { useFileUpload } from "@/features/bookings/hooks/useFileUpload";

export function OverviewTab({ b, code }: { b: Booking; code: string }) {
  const { formatDate } = useDateFormatter();
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const userRole = authUser?.role?.toLowerCase() || "";
  const isCtoOrAdmin = userRole === "admin" || userRole === "chief_tech";
  const isTechnician = userRole === "technician";
  const isOO = userRole === "oo" || userRole === "admin";

  // OO states
  const [mealProvision, setMealProvision] = useState((b as any).mealProvision || "");
  const [driverOvertime, setDriverOvertime] = useState((b as any).driverOvertime || "");
  const [isSavingOO, setIsSavingOO] = useState(false);

  // OO — vehicle & driver
  const [vehicleText, setVehicleText] = useState(b.driver || "");
  const [vehiclePlate, setVehiclePlate] = useState((b as any).vehiclePlate || "");
  const [driverUserId, setDriverUserId] = useState((b as any).driverUserId || "");
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);

  // OO — CREW assignment (PREPARATION stage)
  const [ooCrewIds, setOoCrewIds] = useState<string[]>([""]);
  const [isAssigningCrew, setIsAssigningCrew] = useState(false);
  const [isDeletingCrewId, setIsDeletingCrewId] = useState<string | null>(null);

  // OO — Reverse Checkout
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversingCheckout, setIsReversingCheckout] = useState(false);

  // Tech states
  const [techNotes, setTechNotes] = useState(b.technicianNotes || "");
  const [contentType, setContentType] = useState(b.contentType || "");
  const [venueType, setVenueType] = useState(b.venueType || "");
  const [hangingOrSitting, setHangingOrSitting] = useState(b.hangingOrSitting || "");
  const [isSavingTechNotes, setIsSavingTechNotes] = useState(false);

  useEffect(() => {
    setMealProvision((b as any).mealProvision || "");
    setDriverOvertime((b as any).driverOvertime || "");
    setVehicleText(b.driver || "");
    setVehiclePlate((b as any).vehiclePlate || "");
    setDriverUserId((b as any).driverUserId || "");
    setTechNotes(b.technicianNotes || "");
    setContentType(b.contentType || "");
    setVenueType(b.venueType || "");
    setHangingOrSitting(b.hangingOrSitting || "");
  }, [b]);

  const { data: checkoutSnapshots = [] } = useQuery({
    queryKey: ["booking-checkout-snapshots", b.id],
    queryFn: () => getBookingSnapshotsApi(b.id, { kind: "CHECKOUT" }),
    enabled: !!b.id && (b.status === "ONSITE" || b.status === "COMPLETED" || b.status === "DONE" || b.status === "PARTIALLY_RETURNED"),
  });
  const checkoutSnapshot = checkoutSnapshots?.[0] || null;

  const handleSaveOO = async () => {
    setIsSavingOO(true);
    try {
      await updateBookingApi(b.id, { mealProvision, driverOvertime });
      toast.success("Logistics welfare and overtime saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save logistics info");
    } finally {
      setIsSavingOO(false);
    }
  };

  const handleSaveLogistics = async () => {
    setIsSavingLogistics(true);
    try {
      await updateBookingApi(b.id, {
        vehicleText,
        vehiclePlate,
        driverUserId: driverUserId || undefined,
      });
      toast.success("Vehicle & driver details saved!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save vehicle details");
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleAssignCrew = async () => {
    const valid = ooCrewIds.filter((id) => id);
    if (valid.length === 0) {
      toast.error("Please select at least one crew member.");
      return;
    }
    setIsAssigningCrew(true);
    try {
      await Promise.all(
        valid.map((userId) =>
          createAssignmentApi(b.id, { userId, roleContext: "CREW", isTeamLead: false })
        )
      );
      setOoCrewIds([""]);
      toast.success(`${valid.length} crew member(s) assigned!`);
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign crew");
    } finally {
      setIsAssigningCrew(false);
    }
  };

  const handleRemoveCrew = async (assignmentId: string) => {
    setIsDeletingCrewId(assignmentId);
    try {
      await deleteAssignmentApi(assignmentId);
      toast.success("Crew member removed.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove crew member");
    } finally {
      setIsDeletingCrewId(null);
    }
  };

  const handleReverseCheckout = async () => {
    if (reverseReason.trim().length < 10) {
      toast.error("Please provide a reason of at least 10 characters.");
      return;
    }
    setIsReversingCheckout(true);
    try {
      await checkoutReverseApi(b.id, reverseReason.trim());
      toast.success("Checkout reversed. Booking rolled back to PREPARATION.");
      setShowReverseModal(false);
      setReverseReason("");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to reverse checkout");
    } finally {
      setIsReversingCheckout(false);
    }
  };

  const handleSaveTechNotes = async () => {
    if (hangingOrSitting && hangingOrSitting !== "hanging" && hangingOrSitting !== "sitting") {
      toast.error("Arrangement style must be either hanging or sitting");
      return;
    }
    setIsSavingTechNotes(true);
    try {
      await updateBookingApi(b.id, {
        technicianNotes: techNotes,
        contentType,
        venueType,
        hangingOrSitting: hangingOrSitting || null,
      });
      toast.success("Technician job details and notes saved!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save technician notes");
    } finally {
      setIsSavingTechNotes(false);
    }
  };

  const [screenPools, setScreenPools] = useState<any[]>([]);
  const [screenAvailabilities, setScreenAvailabilities] = useState<Record<string, number>>({});
  const [isLoadingAvail, setIsLoadingAvail] = useState(false);

  // Multi-screen holds state
  const [allocations, setAllocations] = useState<any[]>([{ poolId: "", quantity: 0 }]);
  const [ctoNotes, setCtoNotes] = useState(b.ctoNotes || "");
  const [isSavingTechnical, setIsSavingTechnical] = useState(false);

  useEffect(() => {
    setCtoNotes(b.ctoNotes || "");
  }, [b.ctoNotes]);

  // Fetch existing reservations
  const { data: reservationsRes } = useQuery({
    queryKey: ["booking-reservations", b.id],
    queryFn: () => getBookingReservationsApi(b.id),
    enabled: !!b.id,
  });

  const hasTechnicalHolds =
    !!b.ctoNotes || (reservationsRes?.reservations && reservationsRes.reservations.length > 0);
  const [isEditingHolds, setIsEditingHolds] = useState(!hasTechnicalHolds);

  // Crew Assignment state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignedTechs, setAssignedTechs] = useState<string[]>([""]);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);

  // Restricted Access States (Catching 403 Forbidden Errors)
  const [isPoolsRestricted, setIsPoolsRestricted] = useState(false);
  const [isReservationsRestricted, setIsReservationsRestricted] = useState(false);
  const [isStaffRestricted, setIsStaffRestricted] = useState(false);

  // Fetch screen pools
  useEffect(() => {
    const loadPools = async () => {
      try {
        const [cats, pools] = await Promise.all([
          getInventoryCategoriesApi(),
          getInventoryPoolsApi(),
        ]);
        const screenCat = cats.find((c) => c.key === "screen" || c.name === "LED Screen Modules");
        if (screenCat) {
          setScreenPools(pools.filter((p) => p.categoryId === screenCat.id));
        } else {
          setScreenPools(pools);
        }
      } catch (e: any) {
        console.error("Failed to load screen pools", e);
        if (e.status === 403) {
          setIsPoolsRestricted(true);
        }
      }
    };
    loadPools();
  }, []);

  useEffect(() => {
    if (reservationsRes) {
      const mapped = (reservationsRes.reservations || []).map((r: any) => ({
        poolId: r.poolId || "",
        quantity: parseFloat(r.quantity) || 0,
      }));
      setAllocations(mapped.length > 0 ? mapped : [{ poolId: "", quantity: 0 }]);
      if (mapped.length > 0 || !!b.ctoNotes) {
        setIsEditingHolds(false);
      } else {
        setIsEditingHolds(true);
      }
    }
  }, [reservationsRes, b.ctoNotes]);

  // Fetch live availabilities
  useEffect(() => {
    if (!b.assemblyDate || !b.eventDate || screenPools.length === 0) {
      setScreenAvailabilities({});
      return;
    }
    let active = true;
    const fetchAvailabilities = async () => {
      setIsLoadingAvail(true);
      try {
        const results = await Promise.all(
          screenPools.map(async (p) => {
            try {
              const res = await getPoolAvailabilityApi(p.id, b.assemblyDate, b.eventDate);
              return { sku: p.sku || p.name, available: res.available ?? res.total ?? 0 };
            } catch {
              return { sku: p.sku || p.name, available: parseInt(p.totalQuantity) || 0 };
            }
          })
        );
        if (active) {
          const mapping: Record<string, number> = {};
          results.forEach((r) => {
            mapping[r.sku] = r.available;
          });
          setScreenAvailabilities(mapping);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setIsLoadingAvail(false);
      }
    };
    fetchAvailabilities();
    return () => {
      active = false;
    };
  }, [b.assemblyDate, b.eventDate, screenPools]);

  // Skip staff fetch only for technicians — they lack the required permission.
  useEffect(() => {
    if (isTechnician) return;
    getStaffApi()
      .then(setStaffList)
      .catch((err: any) => {
        console.error("Failed to load staff", err);
        if (err.status === 403) {
          setIsStaffRestricted(true);
        }
      });
  }, [isTechnician]);

  const handleSaveTechnical = async () => {
    const validAllocations = allocations.filter((a) => a.poolId && a.quantity > 0);
    const hasNotes = ctoNotes.trim() !== "";
    if (validAllocations.length === 0 && !hasNotes) {
      toast.error("Please add at least one screen type and quantity or provide CTO notes.");
      return;
    }
    setIsSavingTechnical(true);
    try {
      // 1. Delete existing reservations
      const res = await getBookingReservationsApi(b.id);
      if (res?.reservations) {
        await Promise.all(res.reservations.map((r: any) => deleteReservationApi(b.id, r.id)));
      }

      // 2. Create new holds
      await Promise.all(
        validAllocations.map((a) =>
          createReservationApi(b.id, { poolId: a.poolId, quantity: String(a.quantity) })
        )
      );

      // 3. Update CTO notes and include spec only when screens are selected
      const bookingPayload: Record<string, string> = {
        ctoConsultationNotes: ctoNotes,
      };
      if (validAllocations.length > 0) {
        bookingPayload.itemServiceSpec = validAllocations
          .map((a) => {
            const p = screenPools.find((sp) => sp.id === a.poolId);
            return `${a.quantity}sqm of ${p ? p.name : "LED Screen"}`;
          })
          .join(", ");
      }
      await updateBookingApi(b.code, bookingPayload);

      toast.success("Technical allocation holds saved!");
      setIsEditingHolds(false);
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save technical allocation");
    } finally {
      setIsSavingTechnical(false);
    }
  };

  const handleAssignStaff = async () => {
    const validTechs = assignedTechs.filter((id) => id);
    if (validTechs.length === 0) {
      toast.error("Please select at least one technician to assign.");
      return;
    }
    setIsAssigningStaff(true);
    try {
      if (authUser?.id) {
        await createAssignmentApi(b.id, {
          userId: authUser.id,
          roleContext: "TECHNICIAN",
          isTeamLead: true,
        });
      }

      await Promise.all(
        validTechs.map((techId) =>
          createAssignmentApi(b.id, {
            userId: techId,
            roleContext: "TECHNICIAN",
            isTeamLead: false,
          })
        )
      );

      toast.success("Technician assignment completed!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign crew");
    } finally {
      setIsAssigningStaff(false);
    }
  };

  // Technician inline BOM state (for ACCEPTED status inline workspace)
  const [techBomRows, setTechBomRows] = useState<{ poolId: string; qty: number }[]>([
    { poolId: "", qty: 1 },
    { poolId: "", qty: 1 },
    { poolId: "", qty: 1 },
  ]);

  const { data: techPools = [] } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
    enabled: isTechnician && b.status === "ACCEPTED",
  });

  const { mutate: techAddBomLine, isPending: techAddingLine } = useMutation({
    mutationFn: ({ poolId, quantity }: { poolId: string; quantity: number }) =>
      createBomLineApi(b.id, { poolId, quantity: String(quantity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add item to BOM");
    },
  });

  const { mutate: techUpdateBomLine } = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateBomLineApi(b.id, lineId, { quantity: String(quantity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update quantity");
    },
  });

  const { mutate: techDeleteBomLine, isPending: techDeletingLine } = useMutation({
    mutationFn: (lineId: string) => deleteBomLineApi(b.id, lineId),
    onSuccess: () => {
      toast.success("Item removed from BOM");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove item");
    },
  });

  const handleTechSubmitRows = () => {
    const valid = techBomRows.filter((r) => r.poolId && r.qty > 0);
    if (valid.length === 0) {
      toast.error("Add at least one item with a quantity");
      return;
    }
    let submitted = 0;
    valid.forEach((r) => {
      techAddBomLine(
        { poolId: r.poolId, quantity: r.qty },
        {
          onSuccess: () => {
            submitted++;
            if (submitted === valid.length) {
              toast.success(`${valid.length} item${valid.length > 1 ? "s" : ""} added to BOM`);
              setTechBomRows([
                { poolId: "", qty: 1 },
                { poolId: "", qty: 1 },
                { poolId: "", qty: 1 },
              ]);
            }
          },
        }
      );
    });
  };

  // Technician Attachments (S3 uploads via useFileUpload hook)
  const [techDeletingId, setTechDeletingId] = useState<string | null>(null);

  const {
    uploadFile: techUploadFile,
    deleteAttachment: techDeleteAttachment,
    isUploading: isTechUploading,
    uploadProgress: techUploadProgress,
    uploadingFileName: techUploadingFileName,
    handleDownload: handleTechDownload,
    attachments: techAttachments,
    isLoading: techAttachmentsLoading,
  } = useFileUpload(b);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8 space-y-4">
        {/* ─── Technician Inline Workspace (ACCEPTED status) ─── */}
        {isTechnician && b.status === "ACCEPTED" && (
          <>
            {/* Job Context Card */}
            <Section title="Your Assignment — Equipment & Setup Brief" icon={Package}>
              <div className="space-y-4">
                <div
                  className="rounded-md border p-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in oklab, var(--accent) 6%, var(--surface-2))",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-3)" }}
                  >
                    Equipment Specifications
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Screen Type</span>
                      <div className="font-semibold font-mono mt-0.5">{b.screenType || "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Size</span>
                      <div className="font-semibold font-mono mt-0.5">
                        {b.size ? `${b.size} sqm` : "—"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Arrangement</span>
                      <div className="font-semibold font-mono mt-0.5">
                        {b.arrangement || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {b.ctoNotes && (
                  <div
                    className="rounded-md border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <div
                      className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-3)" }}
                    >
                      CTO Technical Notes
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                      {b.ctoNotes}
                    </p>
                  </div>
                )}

                <div
                  className="rounded-md border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-3)" }}
                  >
                    Event Schedule
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Assembly</span>
                      <div className="font-semibold font-mono mt-0.5">
                        {formatDate(b.assemblyDate)}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Event</span>
                      <div className="font-semibold font-mono mt-0.5">
                        {formatDate(b.eventDate)}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Dismantle</span>
                      <div className="font-semibold font-mono mt-0.5">
                        {formatDate(b.dismantleDate)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[12px]">
                    <span style={{ color: "var(--text-3)" }}>Venue: </span>
                    <span className="font-semibold">{b.venue}</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* Inline BOM Creator — Multi-row */}
            <Section title="Bill of Materials — Add Equipment" icon={Package}>
              <div className="space-y-2 mb-3">
                {techBomRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={row.poolId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTechBomRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, poolId: val } : r))
                        );
                      }}
                      className="h-9 flex-1 rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="">-- Choose Equipment --</option>
                      {techPools.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category?.name || "General"})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={row.qty || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTechBomRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, qty: val } : r))
                        );
                      }}
                      placeholder="Qty"
                      className="h-9 w-20 rounded border bg-[var(--surface-2)] px-2 text-[12px] text-right font-mono"
                      style={{ borderColor: "var(--border)" }}
                    />
                    {techBomRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTechBomRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-9 w-9 shrink-0 rounded border flex items-center justify-center text-destructive transition hover:bg-destructive hover:text-white"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setTechBomRows((prev) => [...prev, { poolId: "", qty: 1 }])}
                  className="text-[11px] font-semibold hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  + Add another row
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleTechSubmitRows}
                  disabled={techAddingLine}
                  className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 h-9 flex items-center gap-1.5"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {techAddingLine ? "Adding..." : "Add All to BOM"}
                </button>
              </div>

              {/* Existing BOM Items */}
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="label-eyebrow pb-2 text-left">Item</th>
                    <th className="label-eyebrow pb-2 text-right w-28">Quantity</th>
                    <th className="label-eyebrow pb-2 text-center w-20">Actions</th>
                    <th className="label-eyebrow pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {b.bomItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                        No items in Bill of Materials yet. Use the form above to add equipment.
                      </td>
                    </tr>
                  ) : (
                    b.bomItems.map((it) => (
                      <tr
                        key={it.id}
                        className="border-b last:border-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="py-3 font-semibold">{it.name}</td>
                        <td className="py-3 text-right">
                          <input
                            type="number"
                            min="1"
                            defaultValue={it.qty}
                            onBlur={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              if (val !== it.qty) {
                                techUpdateBomLine({ lineId: it.id, quantity: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="h-7 w-20 rounded border bg-[var(--surface-2)] px-2 text-[12px] text-right font-mono"
                            style={{ borderColor: "var(--border)" }}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => techDeleteBomLine(it.id)}
                            disabled={techDeletingLine}
                            className="text-destructive text-[11px] font-semibold hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className="rounded border px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
                          >
                            {it.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Section>

            {/* Schematic & Attachments */}
            <Section title="Schematic & Attachments" icon={Paperclip}>
              <div className="space-y-3">
                <FileUploadZone
                  inputId="tech-file-upload"
                  onFileSelect={techUploadFile}
                  isUploading={isTechUploading}
                  uploadProgress={techUploadProgress}
                  uploadingFileName={techUploadingFileName}
                />

                {techAttachmentsLoading ? (
                  <div className="py-4 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
                    Loading files...
                  </div>
                ) : techAttachments.length === 0 ? (
                  <div className="py-4 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
                    No attachments yet. Upload schematic drawings or rigging diagrams above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {techAttachments.map((f) => (
                      <FileCard
                        key={f.id}
                        attachment={f}
                        onDownload={handleTechDownload}
                        onDelete={(id) => setTechDeletingId(id)}
                        layout="row"
                      />
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <DeleteConfirmModal
              isDeleting={false}
              onConfirm={() => {
                if (techDeletingId) {
                  techDeleteAttachment(techDeletingId);
                  setTechDeletingId(null);
                }
              }}
              onCancel={() => setTechDeletingId(null)}
            />
          </>
        )}

        {/* ─── Technician Inline Notes Workspace (ACCEPTED or ONSITE status) ─── */}
        {isTechnician && (b.status === "ACCEPTED" || b.status === "ONSITE") && (
          <Section title="Technician Setup Details & Field Notes" icon={MessageSquare}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Content Type
                  <input
                    type="text"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder="e.g. PPT, Live Stream, Loops"
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Venue Type
                  <input
                    type="text"
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value)}
                    placeholder="e.g. Indoor stage, Marquee"
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Arrangement Style
                  <select
                    value={hangingOrSitting}
                    onChange={(e) => setHangingOrSitting(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="">-- Select --</option>
                    <option value="sitting">Sitting</option>
                    <option value="hanging">Hanging</option>
                  </select>
                </label>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Setup Notes & Observations (Technician-specific)
                <textarea
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="Provide specific notes about structure alignment, visual quality, pixel issues, or other technician observations..."
                  className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveTechNotes}
                  disabled={isSavingTechNotes}
                  className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {isSavingTechNotes ? "Saving..." : "Save Technical Notes"}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ─── ONSITE Stage Dashboard ─── */}
        {b.status === "ONSITE" && (
          <>
            {/* Prominent Amber Status Banner */}
            <div
              className="rounded-lg border p-4 flex items-center gap-3"
              style={{
                borderColor: "color-mix(in oklab, var(--color-status-onsite) 30%, transparent)",
                background: "color-mix(in oklab, var(--color-status-onsite) 8%, var(--surface))",
              }}
            >
              <div
                className="h-2 w-2 rounded-full animate-ping"
                style={{ background: "var(--color-status-onsite)" }}
              />
              <div className="flex-1">
                <span
                  className="text-[12px] font-bold uppercase tracking-wider block"
                  style={{ color: "var(--color-status-onsite)" }}
                >
                  ONSITE (Active Job)
                </span>
                <span className="text-[11px] text-[var(--text-2)] leading-normal mt-0.5 block">
                  Equipment has been checked out from the warehouse and dispatched to the venue. The
                  crew is currently executing onsite setup.
                </span>
              </div>
            </div>

            {/* Read-Only Checked-Out Equipment List */}
            <Section title="Dispatched Equipment (Checked-out Snapshot)" icon={Package}>
              {checkoutSnapshot ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="label-eyebrow pb-2 text-left">Item Name</th>
                        <th className="label-eyebrow pb-2 text-right w-28">Checked Out Qty</th>
                        <th className="label-eyebrow pb-2 text-right w-24">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkoutSnapshot.lines?.map((line: any) => {
                        const name = line.item?.name || line.pool?.name || "Equipment Item";
                        const isPool = !!line.poolId;
                        return (
                          <tr
                            key={line.id}
                            className="border-b last:border-0"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <td className="py-2.5 font-medium">{name}</td>
                            <td className="py-2.5 text-right font-mono font-bold">{line.quantity}</td>
                            <td
                              className="py-2.5 text-right text-[10px] uppercase font-bold"
                              style={{ color: "var(--text-3)" }}
                            >
                              {isPool ? "Bulk" : "Serialized"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-4 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                  No checkout snapshot found. Gear check-out signature is pending in the warehouse.
                </div>
              )}
            </Section>

            {/* Read-Only Logistics & Welfare Brief */}
            <Section title="Onsite Logistics & Team Brief" icon={Truck}>
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div
                  className="rounded border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                    Driver & Vehicle
                  </div>
                  <div className="font-semibold">{b.driver || "No driver assigned"}</div>
                  <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
                    Plate: {(b as any).vehiclePlate || "—"}
                  </div>
                </div>
                <div
                  className="rounded border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                    Onsite Crew
                  </div>
                  <div className="font-semibold">Lead: {b.teamLeader || "—"}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>
                    {b.stageHand}
                  </div>
                </div>
              </div>
            </Section>

            {/* Operations Officer (OO) Welfare and Overtime Forms */}
            {isOO && (
              <Section title="Field Logistics & Welfare Controls (OO Actions)" icon={Wrench}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                      Labor Welfare (Meals provided, budget, supplier, allowances)
                      <textarea
                        value={mealProvision}
                        onChange={(e) => setMealProvision(e.target.value)}
                        placeholder="Detail welfare provisions: budget, allowance, meal supplier..."
                        className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                    <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                      Overtime Tracking (Driver night/public holiday hours)
                      <textarea
                        value={driverOvertime}
                        onChange={(e) => setDriverOvertime(e.target.value)}
                        placeholder="Detail overtime: driver hours, night work justifications..."
                        className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowReverseModal(true)}
                      className="flex items-center gap-1.5 rounded px-3 py-2 text-[11px] font-bold transition hover:brightness-110 cursor-pointer"
                      style={{
                        background: "color-mix(in oklab, var(--destructive) 15%, transparent)",
                        color: "var(--destructive)",
                        border: "1px solid color-mix(in oklab, var(--destructive) 30%, transparent)",
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reverse Checkout
                    </button>
                    <button
                      onClick={handleSaveOO}
                      disabled={isSavingOO}
                      className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                    >
                      {isSavingOO ? "Saving..." : "Save Field Logs"}
                    </button>
                  </div>
                </div>

                {/* Reverse Checkout Inline Modal */}
                {showReverseModal && (
                  <div
                    className="mt-4 rounded-lg border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                      borderColor: "var(--destructive)",
                      background: "color-mix(in oklab, var(--destructive) 6%, var(--surface))",
                    }}
                  >
                    <div
                      className="text-[13px] font-bold mb-1"
                      style={{ color: "var(--destructive)" }}
                    >
                      Reverse Checkout — Roll back to PREPARATION
                    </div>
                    <p className="text-[11px] mb-3" style={{ color: "var(--text-2)" }}>
                      This will move the booking from <strong>ONSITE</strong> back to{" "}
                      <strong>PREPARATION</strong> and clear inventory movements. All held gear will
                      be re-allocated. A reason is required.
                    </p>
                    <textarea
                      value={reverseReason}
                      onChange={(e) => setReverseReason(e.target.value)}
                      placeholder="Explain why checkout is being reversed (min. 10 characters)..."
                      className="w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none mb-3"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowReverseModal(false);
                          setReverseReason("");
                        }}
                        className="rounded border px-3 py-1.5 text-[12px] cursor-pointer"
                        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReverseCheckout}
                        disabled={isReversingCheckout || reverseReason.trim().length < 10}
                        className="rounded px-4 py-1.5 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                        style={{ background: "var(--destructive)", color: "#fff" }}
                      >
                        {isReversingCheckout ? "Reversing..." : "Confirm Reversal"}
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            )}
          </>
        )}

        {/* Stage 1: Technical holds specification (status is RESERVED) */}
        {b.status === "RESERVED" && (
          <>
            {isCtoOrAdmin ? (
              isEditingHolds ? (
                <Section title="Technical Hold Allocation (Chief Tech Review)" icon={Wrench}>
                  {(isPoolsRestricted || isReservationsRestricted) && (
                    <AccessLockOverlay
                      sectionName="Technical Holds Allocation"
                      permissionKey="bom.create"
                    />
                  )}
                  <div className="space-y-4">
                    <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                      Specify screen type holds and check live warehouse availability for this event.
                      Dates:{" "}
                      <strong className="font-mono text-xs">
                        {formatDate(b.assemblyDate)} to {formatDate(b.dismantleDate)}
                      </strong>
                      .
                    </p>

                    {/* Multi-screen hold rows */}
                    <div className="space-y-3">
                      {allocations.map((alloc, idx) => {
                        const selectedPool = screenPools.find((p) => p.id === alloc.poolId);
                        const avail = selectedPool
                          ? screenAvailabilities[selectedPool.sku || selectedPool.name] ?? 0
                          : null;
                        return (
                          <div
                            key={idx}
                            className="flex items-end gap-3 rounded border p-3"
                            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                          >
                            <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                              Screen Type
                              <select
                                value={alloc.poolId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) =>
                                    prev.map((a, i) => (i === idx ? { ...a, poolId: val } : a))
                                  );
                                }}
                                className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <option value="">— Select Screen —</option>
                                {screenPools.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="w-28 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                              Quantity (sqm)
                              <input
                                type="number"
                                value={alloc.quantity || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setAllocations((prev) =>
                                    prev.map((a, i) => (i === idx ? { ...a, quantity: val } : a))
                                  );
                                }}
                                placeholder="qty"
                                className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                                style={{ borderColor: "var(--border)" }}
                              />
                            </label>

                            {alloc.poolId && (
                              <div className="mb-2 text-[11px] text-right shrink-0">
                                <span style={{ color: "var(--text-3)" }}>Avail: </span>
                                <strong
                                  style={{
                                    color:
                                      avail && avail > 10
                                        ? "var(--color-bom-returned)"
                                        : "var(--color-pay-advance)",
                                  }}
                                >
                                  {avail !== null ? `${avail} sqm` : "Checking..."}
                                </strong>
                              </div>
                            )}

                            {allocations.length > 1 && (
                              <button
                                onClick={() =>
                                  setAllocations((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="mb-1 rounded border p-2 text-destructive transition hover:bg-destructive hover:text-white"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setAllocations((prev) => [...prev, { poolId: "", quantity: 0 }])}
                      className="text-[12px] font-semibold hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      + Add another screen
                    </button>

                    {/* Consultation Notes */}
                    <label className="block text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      CTO Technical Arrangement Notes
                      <textarea
                        value={ctoNotes}
                        onChange={(e) => setCtoNotes(e.target.value)}
                        placeholder="e.g. curve truss mounting, requires NovaStar processor, main power from generator..."
                        rows={3}
                        className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>

                    <button
                      onClick={handleSaveTechnical}
                      disabled={isSavingTechnical}
                      className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110"
                      style={{ background: "var(--accent)" }}
                    >
                      {isSavingTechnical ? "Saving..." : "Save Screens & Holds"}
                    </button>
                  </div>
                </Section>
              ) : (
                <Section
                  title="Technical Hold Specifications (Chief Tech Review)"
                  icon={Wrench}
                  action={
                    <button
                      onClick={() => setIsEditingHolds(true)}
                      className="text-[11px] font-semibold hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      Edit holds
                    </button>
                  }
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                        Allocated Equipment
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {allocations
                          .filter((a) => a.poolId)
                          .map((alloc, idx) => {
                            const p = screenPools.find((sp) => sp.id === alloc.poolId);
                            return (
                              <div
                                key={idx}
                                className="flex justify-between border-b py-1 text-[13px]"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <span>{p ? p.name : "LED Screen"}</span>
                                <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {b.ctoNotes && (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          CTO Consultation Notes
                        </div>
                        <p
                          className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border"
                          style={{ borderColor: "var(--border)" }}
                        >
                          {b.ctoNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </Section>
              )
            ) : hasTechnicalHolds ? (
              <Section title="Technical Hold Specifications (Chief Tech Review)" icon={Wrench}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                      Allocated Equipment
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {allocations
                        .filter((a) => a.poolId)
                        .map((alloc, idx) => {
                          const p = screenPools.find((sp) => sp.id === alloc.poolId);
                          return (
                            <div
                              key={idx}
                              className="flex justify-between border-b py-1 text-[13px]"
                              style={{ borderColor: "var(--border)" }}
                            >
                              <span>{p ? p.name : "LED Screen"}</span>
                              <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {b.ctoNotes && (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                        CTO Consultation Notes
                      </div>
                      <p
                        className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {b.ctoNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            ) : (
              <Section title="Technical Hold Allocation" icon={Wrench}>
                <div
                  className="flex items-center gap-2.5 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-[12px]"
                  style={{ color: "var(--color-pay-advance)" }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Awaiting technical hold allocation and notes by Chief Technical Officer.</span>
                </div>
              </Section>
            )}
          </>
        )}

        {/* Stage 2: CTO Crew Assignment (Visible when status is CONFIRMED) */}
        {isCtoOrAdmin && b.status === "CONFIRMED" && (
          <Section title="Assign Lead Crew (Chief Tech Review)" icon={Users}>
            {isStaffRestricted && (
              <AccessLockOverlay sectionName="Crew Assignment" permissionKey="user.manage" />
            )}
            <div className="space-y-4">
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                Assign the technicians to manage this event deployment. You will be automatically
                assigned as the Chief Technician.
              </p>

              <div className="space-y-3">
                {assignedTechs.map((techId, idx) => (
                  <div
                    key={idx}
                    className="flex items-end gap-3 rounded border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Technician #{idx + 1}
                      <select
                        value={techId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedTechs((prev) => prev.map((t, i) => (i === idx ? val : t)));
                        }}
                        className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <option value="">— Select Technician —</option>
                        {staffList
                          .filter(
                            (s) =>
                              s.role.toLowerCase() === "technician" ||
                              s.role.toLowerCase() === "to"
                          )
                          .map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={assignedTechs.includes(s.id) && s.id !== techId}
                            >
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>

                    {assignedTechs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAssignedTechs((prev) => prev.filter((_, i) => i !== idx))}
                        className="mb-1 rounded bg-red-600/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-600/30"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAssignedTechs((prev) => [...prev, ""])}
                  className="rounded px-3 py-1.5 text-xs font-semibold hover:brightness-110"
                  style={{ background: "var(--surface-3)", color: "var(--text-1)" }}
                >
                  + Add another technician
                </button>

                <button
                  onClick={handleAssignStaff}
                  disabled={isAssigningStaff}
                  className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110"
                  style={{ background: "var(--accent)" }}
                >
                  {isAssigningStaff ? "Assigning..." : "Assign Crew & Dispatch"}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* Stage 3: OO Crew & Logistics (PREPARATION stage) */}
        {isOO && b.status === "PREPARATION" && (
          <>
            {/* OO Crew Picker */}
            <Section title="Assign Field Crew (Operations)" icon={Users}>
              {isStaffRestricted && (
                <AccessLockOverlay sectionName="Crew Assignment" permissionKey="assignment.assign_crew" />
              )}
              <div className="space-y-4">
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  Assign stagehands and freelancers for this deployment. These crew members will
                  appear on the onsite team brief.
                </p>

                {/* Existing CREW assignments */}
                {(b.assignments || []).filter((a: any) => a.roleContext === "CREW").length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                      Currently Assigned Crew
                    </div>
                    {(b.assignments || [])
                      .filter((a: any) => a.roleContext === "CREW")
                      .map((a: any) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded border px-3 py-2 text-[12px]"
                          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                        >
                          <span className="font-medium">{a.user?.name || "—"}</span>
                          <button
                            onClick={() => handleRemoveCrew(a.id)}
                            disabled={isDeletingCrewId === a.id}
                            className="text-[11px] font-semibold rounded px-2 py-1 transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                            style={{
                              background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                              color: "var(--destructive)",
                            }}
                          >
                            {isDeletingCrewId === a.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Add new crew */}
                <div className="space-y-2">
                  {ooCrewIds.map((crewId, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                        Crew member #{idx + 1}
                        <select
                          value={crewId}
                          onChange={(e) =>
                            setOoCrewIds((prev) =>
                              prev.map((c, i) => (i === idx ? e.target.value : c))
                            )
                          }
                          className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px] cursor-pointer"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <option value="">— Select crew member —</option>
                          {staffList
                            .filter((s) =>
                              ["stagehand", "freelancer", "sh", "fl"].includes(s.role.toLowerCase())
                            )
                            .map((s) => (
                              <option
                                key={s.id}
                                value={s.id}
                                disabled={ooCrewIds.includes(s.id) && s.id !== crewId}
                              >
                                {s.name} ({s.role})
                              </option>
                            ))}
                        </select>
                      </label>
                      {ooCrewIds.length > 1 && (
                        <button
                          onClick={() => setOoCrewIds((prev) => prev.filter((_, i) => i !== idx))}
                          className="mb-1 rounded px-2 py-2 text-[11px] font-semibold cursor-pointer"
                          style={{
                            background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                            color: "var(--destructive)",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOoCrewIds((prev) => [...prev, ""])}
                    className="rounded px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
                    style={{ background: "var(--surface-3)", color: "var(--text-1)" }}
                  >
                    + Add another crew member
                  </button>
                  <button
                    onClick={handleAssignCrew}
                    disabled={isAssigningCrew}
                    className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--accent)" }}
                  >
                    {isAssigningCrew ? "Assigning…" : "Assign Crew"}
                  </button>
                </div>
              </div>
            </Section>

            {/* OO Vehicle & Driver Picker */}
            <Section title="Vehicle & Driver Details" icon={Truck}>
              <div className="space-y-4">
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  Record the vehicle and driver dispatched with this booking. This information will
                  appear on the onsite brief.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                    Driver Name / Description
                    <input
                      type="text"
                      value={vehicleText}
                      onChange={(e) => setVehicleText(e.target.value)}
                      placeholder="e.g. Abebe Kebede"
                      className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                    Vehicle Plate Number
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="e.g. AA 3-A12345"
                      className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] font-mono"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="text-[11px] font-semibold block col-span-2" style={{ color: "var(--text-2)" }}>
                    Assign Driver from Staff List
                    <select
                      value={driverUserId}
                      onChange={(e) => setDriverUserId(e.target.value)}
                      className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px] cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="">— Select driver (optional) —</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveLogistics}
                    disabled={isSavingLogistics}
                    className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    {isSavingLogistics ? "Saving…" : "Save Vehicle & Driver"}
                  </button>
                </div>
              </div>
            </Section>
          </>
        )}

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

        <Section title="Venue & Setup" icon={MapPin}>
          <div className="grid grid-cols-2 gap-x-6">
            <KV label="Venue" value={b.venue} />
            <KV label="Arrangement" value={b.arrangement} mono />
            <KV label="Screen Type" value={b.screenType} mono />
            <KV label="Size (sqm)" value={b.size} mono />
            {b.contentType && <KV label="Content Type" value={b.contentType} />}
            {b.venueType && <KV label="Venue Type" value={b.venueType} />}
            {b.hangingOrSitting && <KV label="Arrangement Style" value={b.hangingOrSitting} />}
          </div>
        </Section>

        {!isTechnician && (
          <Section title="Logistics & Team" icon={Truck}>
            <div className="grid grid-cols-2 gap-x-6">
              <KV label="Team Leader" value={b.teamLeader} />
              <KV label="Stage Hand" value={b.stageHand} />
              <KV label="Driver" value={b.driver} />
              <KV label="Meal Budget" value={`ETB ${b.mealBudget.toLocaleString()}`} mono />
            </div>
          </Section>
        )}

        <Section title="Notes & Special Requirements" icon={MessageSquare}>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] block mb-1">
                CTO Consultation Notes
              </span>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {b.ctoNotes || "No special requirements noted. Coordinate with venue AV for power distribution."}
              </p>
            </div>
            {b.technicianNotes && (
              <div className="border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] block mb-1">
                  Technician Setup & Field Notes
                </span>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {b.technicianNotes}
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>

      <div className="col-span-4 space-y-4">
        <Section title="Schedule" icon={Calendar}>
          <KV label="Assembly" value={formatDate(b.assemblyDate)} mono />
          <KV label="Event" value={formatDate(b.eventDate)} mono />
          <KV label="Dismantle" value={formatDate(b.dismantleDate)} mono />
        </Section>

        {!isTechnician && (
          <Section title="Financial" icon={DollarSign}>
            <KV label="Contract" value={`ETB ${b.amount.toLocaleString()}`} mono />
            <KV
              label="Paid"
              value={
                b.payment === "PAID"
                  ? `ETB ${b.amount.toLocaleString()}`
                  : b.payment === "ADVANCE"
                    ? `ETB ${(b.amount / 2).toLocaleString()}`
                    : "ETB 0"
              }
              mono
            />
            <KV
              label="Balance"
              value={
                b.payment === "PAID" ? "ETB 0" : `ETB ${(b.amount / 2).toLocaleString()}`
              }
              mono
            />
            <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <KV label="Status" value={<PaymentBadge status={b.payment} />} />
            </div>
          </Section>
        )}

        <Section title="Quick Stats" icon={CheckCircle2}>
          <KV
            label="Days to Event"
            value={Math.max(
              0,
              Math.ceil((new Date(b.eventDate).getTime() - Date.now()) / 86400000)
            )}
            mono
          />
          <KV label="Crew Size" value={b.assignees.length + 4} mono />
          <KV label="BOM Items" value={b.bomItems.length} mono />
          <KV label="Created" value={b.createdAt} mono />
        </Section>
      </div>
    </div>
  );
}
