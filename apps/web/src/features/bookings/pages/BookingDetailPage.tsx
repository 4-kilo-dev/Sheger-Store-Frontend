import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Edit3, Printer, Share2, MoreHorizontal, MapPin, Calendar,
  Phone, User, Building2, DollarSign, Paperclip, MessageSquare,
  Package, Users, Clock, CheckCircle2, AlertTriangle, Download, Upload,
  Truck, Wrench, FileText, ClipboardCheck, UserCheck, PackageCheck,
  ChevronRight, Star, Send, Sparkles, Check, X, AlertCircle, Lock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-stepper";
import { 
  getBookingDetailApi, 
  transitionBookingStatusApi, 
  recordBookingPaymentApi, 
  updateBookingApi,
  createReservationApi,
  createAssignmentApi,
  getBookingReservationsApi,
  deleteReservationApi,
  STATUS_ORDER,
  STATUS_LABELS,
  type Booking,
  type BookingStatus,
  acceptAssignmentApi,
  declineAssignmentApi,
  createBomLineApi,
  updateBomLineApi,
  deleteBomLineApi,
  createHandoffSnapshotApi,
  createDamageReportApi,
  submitEvaluationApi
} from "@/features/bookings/services/bookings.api";
import { getInventoryCategoriesApi, getInventoryPoolsApi, getPoolAvailabilityApi } from "@/features/inventory/services/inventory.api";
import { getStaffApi } from "@/features/users/services/staff.api";
import { requestPermissionApi } from "@/features/notifications/services/notifications.api";
import { useActiveProfile } from "@/hooks/use-active-profile";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  listPerformanceMetricsApi,
  getInternalEvaluationApi,
  submitInternalEvaluationApi,
  getClientEvaluationApi,
  submitClientEvaluationApi,
  type PerformanceMetric,
  type InternalEvaluation,
  type ClientEvaluation,
  type SubmitInternalEvaluationPayload,
  type SubmitClientEvaluationPayload
} from "@/features/bookings/services/evaluations.api";
import {
  getBookingAttachmentsApi,
  getUploadUrlApi,
  uploadFileDirectApi,
  confirmUploadApi,
  getDownloadUrlApi,
  deleteAttachmentApi,
  type Attachment
} from "@/features/bookings/services/attachments.api";
import { Trash2, File, Image, FileArchive, Loader2 } from "lucide-react";

const _Route = createFileRoute("/bookings/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code} · Booking · Vortex Visual` },
      { name: "description", content: `Booking details for ${params.code}.` },
    ],
  }),
  loader: ({ params }) => {
    return { code: params.code };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8" style={{ color: "var(--accent)" }} />
        <div className="text-[15px] font-semibold">Booking not found</div>
        <Link to="/bookings" className="text-[12px]" style={{ color: "var(--accent)" }}>← Back to Bookings</Link>
      </div>
    </AppShell>
  ),
  component: BookingDetail,
});

const TABS = ["Overview", "Schedule", "Team", "Equipment", "Payments", "Files", "Activity", "Evaluations"] as const;

interface BookingAction {
  id: string;
  label: string;
  icon: any;
  targetStatus: BookingStatus;
  allowedRoles: string[];
  variant: "primary" | "outline" | "destructive";
  requiresReason?: boolean;
  requiresForm?: string;
  color?: string;
}

const BOOKING_ACTIONS: Record<BookingStatus, BookingAction[]> = {
  RESERVED: [
    { id: "booking.confirm", label: "Confirm Booking", icon: DollarSign, targetStatus: "CONFIRMED", allowedRoles: ["admin", "supervisor", "ccr", "chief_tech"], variant: "primary", requiresForm: "payment" },
    { id: "booking.cancel", label: "Cancel Booking", icon: X, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"], variant: "destructive" },
  ],
  CONFIRMED: [
    { id: "assignment.assign_technician", label: "Assign Technician", icon: UserCheck, targetStatus: "ASSIGNED", allowedRoles: ["admin", "supervisor", "chief_tech"], variant: "primary", requiresForm: "assign" },
    { id: "booking.cancel", label: "Cancel Booking", icon: X, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"], variant: "destructive" },
  ],
  ASSIGNED: [
    { id: "assignment.accept", label: "Accept Assignment", icon: CheckCircle2, targetStatus: "ACCEPTED", allowedRoles: ["admin", "supervisor", "technician"], variant: "primary" },
    { id: "assignment.decline", label: "Decline", icon: X, targetStatus: "CONFIRMED", allowedRoles: ["admin", "supervisor", "technician"], variant: "outline", requiresReason: true },
    { id: "booking.cancel", label: "Cancel Booking", icon: X, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"], variant: "destructive" },
  ],
  ACCEPTED: [
    { id: "bom.create", label: "Prepare Checklist (BOM)", icon: Package, targetStatus: "PREPARATION", allowedRoles: ["admin", "supervisor", "chief_tech"], variant: "primary" },
    { id: "booking.cancel", label: "Cancel Booking", icon: X, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"], variant: "destructive" },
  ],
  PREPARATION: [
    { id: "inventory.checkout", label: "Check-out Gear", icon: Truck, targetStatus: "ONSITE", allowedRoles: ["admin", "supervisor", "storekeeper", "oo"], variant: "primary", requiresForm: "dispatch" },
    { id: "booking.cancel_override", label: "Force Cancel", icon: AlertTriangle, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor"], variant: "destructive", requiresReason: true },
  ],
  ONSITE: [
    { id: "eval.submit_internal", label: "Submit Event Evaluation", icon: CheckCircle2, targetStatus: "COMPLETED", allowedRoles: ["admin", "supervisor", "chief_tech", "technician", "oo"], variant: "primary" },
    { id: "inventory.checkin", label: "Check-in Gear", icon: PackageCheck, targetStatus: "DONE", allowedRoles: ["admin", "supervisor", "storekeeper", "oo"], variant: "outline" },
    { id: "booking.cancel_override", label: "Force Cancel", icon: AlertTriangle, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor"], variant: "destructive", requiresReason: true },
  ],
  COMPLETED: [
    { id: "inventory.checkin", label: "Check-in Remaining Gear", icon: PackageCheck, targetStatus: "DONE", allowedRoles: ["admin", "supervisor", "storekeeper", "oo"], variant: "primary" },
    { id: "booking.cancel_override", label: "Force Cancel", icon: AlertTriangle, targetStatus: "CANCELED", allowedRoles: ["admin", "supervisor"], variant: "destructive", requiresReason: true },
  ],
  PARTIALLY_RETURNED: [
    { id: "inventory.checkin", label: "Check-in Remaining Gear", icon: PackageCheck, targetStatus: "DONE", allowedRoles: ["admin", "supervisor", "storekeeper", "oo"], variant: "primary" },
    { id: "inventory.checkout", label: "Check-out Equipment", icon: Truck, targetStatus: "ONSITE", allowedRoles: ["admin", "supervisor", "storekeeper", "oo"], variant: "outline" },
  ],
  DONE: [],
  CANCELED: [],
};

export function BookingDetail() {
  const  navigate = useNavigate();
  const { code } = _Route.useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BookingAction | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  
  const [paymentType, setPaymentType] = useState<"advance" | "fully_paid">("advance");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [amountReceived, setAmountReceived] = useState(0);

  const authUser = useAuthUser();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["booking", code],
    queryFn: () => getBookingDetailApi(code),
  });

  // Auto-redirect to friendly SB code if loaded with a UUID
  useEffect(() => {
    if (booking && booking.code && code !== booking.code) {
      navigate({
        to: "/bookings/$code" as any,
        params: { code: booking.code },
        replace: true,
      });
    }
  }, [booking, code, navigate]);

  // Technician role detection
  const isTechnician = authUser?.role?.toLowerCase() === "technician";

  // Crew Review Modal states
  const [showInternalModal, setShowInternalModal] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [teamSize, setTeamSize] = useState(0);
  const [notes, setNotes] = useState("");
  const [internalScores, setInternalScores] = useState<Record<string, number>>({});

  const { data: metrics } = useQuery({
    queryKey: ["active-metrics"],
    queryFn: () => listPerformanceMetricsApi({ isActive: true }),
  });
  const internalMetrics = metrics?.filter((m) => m.category === "internal") || [];

  const { mutate: submitInternal, isPending: submittingInternal } = useMutation({
    mutationFn: (payload: SubmitInternalEvaluationPayload) => submitInternalEvaluationApi(code, payload),
    onSuccess: () => {
      toast.success("Internal crew evaluation submitted!");
      queryClient.invalidateQueries({ queryKey: ["booking-internal-eval", code] });
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      setShowInternalModal(false);
      setInternalScores({});
      setNotes("");
      // Transition status to COMPLETED automatically
      transitionStatus({ toStatus: "COMPLETED" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit crew evaluation");
    }
  });

  const openInternalForm = () => {
    if (!booking) return;
    const initialScores: Record<string, number> = {};
    internalMetrics.forEach((m) => {
      initialScores[m.id] = m.valueType === "boolean" ? 1 
                          : m.valueType === "rating_5" ? 5 
                          : m.valueType === "percentage" ? 100 
                          : 10;
    });
    setInternalScores(initialScores);
    setVenueName(booking.venue);
    setEventDate(booking.eventDate);
    setTeamSize((booking.assignees?.length || 0) + 2);
    setNotes("");
    setShowInternalModal(true);
  };

  // Decline Assignment Modal States & Mutations
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Find technician's pending assignment
  const myTechnicianAssignment = useMemo(() => {
    if (!booking || !booking.assignments) return null;
    return booking.assignments.find(
      (a: any) => a.userId === authUser?.id && a.roleContext === "TECHNICIAN"
    );
  }, [booking, authUser]);

  const pendingAssignment = useMemo(() => {
    return myTechnicianAssignment && myTechnicianAssignment.respondedAt === null;
  }, [myTechnicianAssignment]);

  const { mutate: acceptAssignment, isPending: accepting } = useMutation({
    mutationFn: () => acceptAssignmentApi(myTechnicianAssignment.id),
    onSuccess: () => {
      toast.success("Assignment accepted successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept assignment");
    }
  });

  const { mutate: declineAssignment, isPending: declining } = useMutation({
    mutationFn: (reason: string) => declineAssignmentApi(myTechnicianAssignment.id, reason),
    onSuccess: () => {
      toast.success("Assignment declined.");
      setShowDeclineModal(false);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      // Redirect back to bookings list page since job was declined
      navigate({ to: "/bookings" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to decline assignment");
    }
  });

  // Report Damaged Gear Modal States & Mutations
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageSeverity, setDamageSeverity] = useState("LOW");

  const { mutate: submitDamageReport, isPending: submittingDamage } = useMutation({
    mutationFn: (payload: { bookingId: string; description: string; severity: string }) => 
      createDamageReportApi(payload),
    onSuccess: () => {
      toast.success("Damage report submitted successfully!");
      setShowDamageModal(false);
      setDamageDescription("");
      setDamageSeverity("LOW");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit damage report");
    }
  });

  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    getStaffApi()
      .then(setStaff)
      .catch((e) => console.error("Failed to load staff in details page", e));
  }, []);

  // const { data: booking, isLoading, error } = useQuery({
  //   queryKey: ["booking", code],
  //   queryFn: () => getBookingDetailApi(code),
  // });



  useEffect(() => {
    if (booking && amountReceived === 0) {
      setAmountReceived(booking.amount);
    }
  }, [booking]);

  const { mutate: transitionStatus, isPending: isTransitioning } = useMutation({
    mutationFn: ({ toStatus, reason }: { toStatus: BookingStatus; reason?: string }) => 
      transitionBookingStatusApi(code, toStatus, reason),
    onSuccess: () => {
      toast.success("Booking state advanced successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to advance booking state");
    }
  });

  const { mutate: recordPayment, isPending: isRecordingPayment } = useMutation({
    mutationFn: ({ toStatus, amount }: { toStatus: string; amount: number }) => 
      recordBookingPaymentApi(code, toStatus, amount),
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    }
  });

  const { mutate: confirmBookingWithPayment, isPending: isConfirmingWithPayment } = useMutation({
    mutationFn: async ({ toPaymentStatus, amount }: { toPaymentStatus: string; amount: number }) => {
      await recordBookingPaymentApi(code, toPaymentStatus, amount);
      await transitionBookingStatusApi(code, "CONFIRMED");
    },
    onSuccess: () => {
      toast.success("Booking confirmed and payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to confirm booking");
    }
  });

  const userRole = authUser?.role?.toLowerCase() || "";
  const isUserDriver = authUser?.id && booking?.driverUserId && authUser.id === booking.driverUserId;

  const actions = useState(() => [] as BookingAction[])[0]; // initialize empty, will compute below
  const computedActions = (() => {
    if (!booking || !userRole) return [];
    const list = BOOKING_ACTIONS[booking.status] || [];
    const hasTechnicalHolds = !!booking.ctoNotes || !!booking.itemServiceSpec;

    return list.filter((act) => {
      const isRoleAllowed = act.allowedRoles.includes(userRole);
      if (!isRoleAllowed) return false;

      // Special case: Confirm Booking is gated by technical holds being saved
      if (booking.status === "RESERVED" && act.id === "booking.confirm") {
        return hasTechnicalHolds;
      }

      // Special case: Accept/Decline is driver-restricted
      if (booking.status === "ASSIGNED" && (act.id === "assignment.accept" || act.id === "assignment.decline")) {
        const isSupervisorOrAdmin = ["admin", "supervisor"].includes(userRole);
        return isUserDriver || isSupervisorOrAdmin;
      }
      return true;
    });
  })();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <div className="text-[14px] font-semibold">Loading booking details...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !booking) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8" style={{ color: "var(--accent)" }} />
          <div className="text-[15px] font-semibold">Booking not found or failed to load</div>
          <Link to="/bookings" className="text-[12px]" style={{ color: "var(--accent)" }}>← Back to Bookings</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Top action row */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/bookings" className="flex items-center gap-2 text-[12px] font-semibold transition hover:opacity-80" style={{ color: "var(--text-2)" }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Bookings
        </Link>
        <div className="flex items-center gap-2">
          {[
            { icon: Printer, label: "Print" },
            { icon: Share2, label: "Share" },
            { icon: Edit3, label: "Edit" },
          ].filter(item => !(isTechnician && item.label === "Edit")).map(({ icon: I, label }) => (
            <button key={label} className="flex h-8 items-center gap-1.5 rounded-md border bg-[var(--surface)] px-2.5 text-[12px] transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              <I className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          {!isTechnician && computedActions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                setSelectedAction(act);
                setShowActionModal(true);
                setCancellationReason(""); // reset reason
              }}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition hover:brightness-110"
              style={{
                background: act.variant === "destructive" ? "var(--destructive)" : act.variant === "outline" ? "transparent" : "var(--accent)",
                color: act.variant === "outline" ? "var(--text-1)" : "var(--accent-foreground)",
                border: act.variant === "outline" ? "1px solid var(--border)" : "none"
              }}
            >
              <act.icon className="h-3.5 w-3.5" />
              {act.label}
            </button>
          ))}
          <button className="flex h-8 w-8 items-center justify-center rounded-md border" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SOP Action Modal */}
      {showActionModal && selectedAction && (
        <div className="mb-4 rounded-lg border-2 p-5" style={{ borderColor: selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)", background: `color-mix(in oklab, ${selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)"} 6%, var(--surface))` }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)", color: "#fff" }}>
                <selectedAction.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold">{selectedAction.label}</h3>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
                  This will transition the booking from <strong>{booking.status}</strong> to <strong>{selectedAction.targetStatus}</strong>.
                  <br />
                  Permission required: <strong>{selectedAction.id}</strong>
                </p>

                {booking.status === "RESERVED" && selectedAction.id === "booking.confirm" && booking.payment === "UNPAID" && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Payment Type
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as "advance" | "fully_paid")}
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <option value="advance">Advance Deposit</option>
                        <option value="fully_paid">Fully Paid</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Payment Method
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <option>Bank Transfer</option>
                        <option>Cash</option>
                        <option>Mobile Money</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Total Contract Value (ETB)
                      <input
                        type="number"
                        value={amountReceived || ""}
                        onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                  </div>
                )}
                {booking.status === "RESERVED" && selectedAction.id === "booking.confirm" && booking.payment === "UNPAID" && (
                  <div className="mt-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                    {paymentType === "advance" ? (
                      <span>Advance payment will record <strong>ETB {(amountReceived / 2).toLocaleString()}</strong> (50%) as paid, leaving a balance of <strong>ETB {(amountReceived / 2).toLocaleString()}</strong>.</span>
                    ) : (
                      <span>Full payment will record the entire <strong>ETB {amountReceived.toLocaleString()}</strong> as paid, leaving no balance.</span>
                    )}
                  </div>
                )}
                {booking.status === "RESERVED" && selectedAction.id === "booking.confirm" && booking.payment === "UNPAID" && amountReceived < 1000 && (
                  <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Minimum payment amount is ETB 1,000.</span>
                  </div>
                )}

                {booking.status === "CONFIRMED" && selectedAction.id === "assignment.assign_technician" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Assign Chief Technician
                      <select className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]" style={{ borderColor: "var(--border)" }}>
                        <option value="">— Select —</option>
                        {staff
                          .filter((s) => s.role.toLowerCase().includes("chief") || s.role.toLowerCase() === "cto")
                          .map((s) => <option key={s.id} value={s.name}>{s.name}</option>)
                        }
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Assign Technician
                      <select className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]" style={{ borderColor: "var(--border)" }}>
                        <option value="">— Select —</option>
                        {staff
                          .filter((s) => s.role.toLowerCase() === "technician" || s.role.toLowerCase() === "to")
                          .map((s) => <option key={s.id} value={s.name}>{s.name}</option>)
                        }
                      </select>
                    </label>
                  </div>
                )}

                {booking.status === "PREPARATION" && selectedAction.id === "inventory.checkout" && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Team Leader
                      <input defaultValue={booking.teamLeader} className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]" style={{ borderColor: "var(--border)" }} />
                    </label>
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Driver
                      <input defaultValue={booking.driver} className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]" style={{ borderColor: "var(--border)" }} />
                    </label>
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Meal Budget (ETB)
                      <input type="number" defaultValue={booking.mealBudget} className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]" style={{ borderColor: "var(--border)" }} />
                    </label>
                  </div>
                )}

                {selectedAction.requiresReason && (
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                      Reason for action / override (minimum 10 characters)
                      <textarea
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Please write the operational reason..."
                        className="mt-1 w-full rounded-md border bg-[var(--surface-2)] p-2 text-[12px] h-20 block resize-none"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => { setShowActionModal(false); setSelectedAction(null); }} className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>✕</button>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => {
                if (selectedAction.id === "booking.confirm" && booking.payment === "UNPAID") {
                  if (amountReceived < 1000) {
                    toast.error("Minimum payment amount is ETB 1,000");
                    return;
                  }
                  confirmBookingWithPayment({ toPaymentStatus: paymentType, amount: amountReceived });
                } else {
                  transitionStatus({ toStatus: selectedAction.targetStatus, reason: cancellationReason || undefined });
                }
              }}
              disabled={
                isTransitioning || 
                isRecordingPayment || 
                isConfirmingWithPayment || 
                (selectedAction.requiresReason && cancellationReason.trim().length < 10) ||
                (selectedAction.id === "booking.confirm" && booking.payment === "UNPAID" && amountReceived < 1000)
              }
              className="rounded-md px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)", color: selectedAction.variant === "destructive" ? "#fff" : "var(--accent-foreground)" }}
            >
              {isTransitioning || isRecordingPayment || isConfirmingWithPayment ? "Processing..." : `Confirm: ${selectedAction.label}`}
            </button>
            <button onClick={() => { setShowActionModal(false); setSelectedAction(null); }} className="rounded-md border px-4 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="mb-4 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold tracking-tight" style={{ color: "var(--accent)" }}>{booking.code}</h1>
              <StatusBadge status={booking.status} size="lg" />
              <PaymentBadge status={booking.payment} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-[13px]" style={{ color: "var(--text-2)" }}>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{booking.client}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{booking.venue}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{booking.eventDate}</span>
            </div>
            {booking.ctoNotes && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md border p-2 text-[11px]" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-2)" }}>
                <Wrench className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--accent)" }} />
                <span><strong>CTO Note:</strong> {booking.ctoNotes}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="label-eyebrow">Total Contract Value</div>
            <div className="mt-1 font-mono text-[24px] font-bold">ETB {booking.amount.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-6">
          <StatusStepper current={booking.status} />
        </div>
      </div>

      {/* Technician Workflow Banner */}
      {isTechnician && booking && (
        <div className="mb-4 rounded-lg border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300" style={{ borderColor: "var(--accent)", background: "color-mix(in oklab, var(--accent) 5%, var(--surface))" }}>
          <div>
            <div className="text-[14px] font-bold">Technician Operations Panel</div>
            <div className="text-[11px] mt-1" style={{ color: "var(--text-2)" }}>
              {booking.status === "ASSIGNED" && pendingAssignment && (
                <span>You have a pending crew assignment for this booking. Please accept or decline below.</span>
              )}
              {booking.status === "ASSIGNED" && !pendingAssignment && (
                <span>Waiting for other crew members to respond to their assignments.</span>
              )}
              {booking.status === "ACCEPTED" && (
                <span>BOM Preparation: Specify screen, cabling, and rigging requirements in the <strong>Equipment</strong> tab, upload schematic drawing in the <strong>Files</strong> tab, then submit to Operations.</span>
              )}
              {booking.status === "PREPARATION" && (
                <span>Setup checklist submitted. Warehouse storekeepers are preparing checkout.</span>
              )}
              {booking.status === "ONSITE" && (
                <span>Event active. Report any equipment failures or submit the post-event crew evaluation once completed.</span>
              )}
              {booking.status === "COMPLETED" && (
                <span>Event completed. Crew evaluation submitted successfully.</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {booking.status === "ASSIGNED" && pendingAssignment && (
              <>
                <button
                  onClick={() => acceptAssignment()}
                  disabled={accepting}
                  className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: "var(--color-status-done)", color: "#fff" }}
                >
                  {accepting ? "Accepting..." : "Accept Assignment"}
                </button>
                <button
                  onClick={() => setShowDeclineModal(true)}
                  className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                  style={{ background: "var(--destructive)", color: "#fff" }}
                >
                  Decline Assignment
                </button>
              </>
            )}

            {booking.status === "ACCEPTED" && (
              <button
                onClick={async () => {
                  try {
                    await createHandoffSnapshotApi(booking.id);
                    transitionStatus({ toStatus: "PREPARATION" });
                  } catch (e: any) {
                    toast.error(e.message || "Failed to submit BOM");
                  }
                }}
                disabled={isTransitioning}
                className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {isTransitioning ? "Submitting..." : "Submit BOM to Operations"}
              </button>
            )}

            {(booking.status === "ONSITE" || booking.status === "COMPLETED") && (
              <button
                onClick={() => setShowDamageModal(true)}
                className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                style={{ background: "var(--destructive)", color: "#fff" }}
              >
                Report Damaged Gear
              </button>
            )}

            {booking.status === "ONSITE" && (
              <button
                onClick={openInternalForm}
                className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Submit Crew Evaluation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {(isTechnician
          ? TABS.filter((t) => t !== "Payments" && t !== "Schedule" && t !== "Team")
          : TABS
        ).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-4 py-2.5 text-[12px] font-semibold transition"
              style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
            >
              {t}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "Overview" && <OverviewTab b={booking} />}
      {tab === "Schedule" && <ScheduleTab b={booking} />}
      {tab === "Team" && <TeamTab b={booking} />}
      {tab === "Equipment" && <EquipmentTab b={booking} />}
      {tab === "Payments" && <PaymentsTab b={booking} />}
      {tab === "Files" && <FilesTab b={booking} />}
      {tab === "Activity" && <ActivityTab b={booking} />}
      {tab === "Evaluations" && <EvaluationsTab b={booking} openInternalForm={openInternalForm} />}

      {/* Decline Assignment Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border p-5 shadow-xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-[15px] font-bold text-destructive">Decline Assignment</h3>
              <button onClick={() => setShowDeclineModal(false)} className="text-[12px] font-semibold hover:opacity-80" style={{ color: "var(--text-3)" }}>✕</button>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Reason for declining (minimum 10 characters)
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please state why you are declining this job (e.g. scheduling conflict, double-booked)..."
                  className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => declineAssignment(declineReason)}
                disabled={declining || declineReason.trim().length < 10}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--destructive)", color: "#fff" }}
              >
                {declining ? "Processing..." : "Confirm Decline"}
              </button>
              <button onClick={() => setShowDeclineModal(false)} className="rounded border px-4 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Damaged Gear Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-[15px] font-bold text-destructive">Report Damaged / Missing Gear</h3>
              <button onClick={() => setShowDamageModal(false)} className="text-[12px] font-semibold hover:opacity-80" style={{ color: "var(--text-3)" }}>✕</button>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Damage Severity
                <select
                  value={damageSeverity}
                  onChange={(e) => setDamageSeverity(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="LOW">Low (Minor cosmetic / easily fixed)</option>
                  <option value="MEDIUM">Medium (Requires replacement/repair before next setup)</option>
                  <option value="HIGH">High (Major failure / completely unusable)</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Description of Damage / Missing items
                <textarea
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Describe visible damage, symptoms, or what items went missing..."
                  className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => submitDamageReport({ bookingId: booking.id, description: damageDescription, severity: damageSeverity })}
                disabled={submittingDamage || !damageDescription.trim()}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--destructive)", color: "#fff" }}
              >
                {submittingDamage ? "Submitting..." : "Submit Report"}
              </button>
              <button onClick={() => setShowDamageModal(false)} className="rounded border px-4 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Internal Evaluation Modal */}
      {showInternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-[15px] font-bold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /> Submit Crew Evaluation ({booking.code})
              </h3>
              <button onClick={() => setShowInternalModal(false)} className="text-[12px] font-semibold hover:opacity-80" style={{ color: "var(--text-3)" }}>✕</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Client / Venue Location
                  <input 
                    type="text" 
                    value={venueName} 
                    onChange={(e) => setVenueName(e.target.value)} 
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Event Date
                  <input 
                    type="date" 
                    value={eventDate} 
                    onChange={(e) => setEventDate(e.target.value)} 
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Team Size (On-site Crew)
                  <input 
                    type="number" 
                    value={teamSize} 
                    onChange={(e) => setTeamSize(parseInt(e.target.value) || 0)} 
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="label-eyebrow text-[9px]">Crew Compliance & Standards Checklist</span>
                <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  {internalMetrics.length === 0 ? (
                    <div className="text-[11px] text-center py-2" style={{ color: "var(--text-3)" }}>No metrics configured in settings.</div>
                  ) : (
                    internalMetrics.map((m) => {
                      const score = internalScores[m.id] ?? (m.valueType === "boolean" ? 1 : m.valueType === "rating_5" ? 5 : m.valueType === "percentage" ? 100 : 10);
                      return (
                        <div key={m.id} className="rounded border p-2.5 bg-[var(--surface)] flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-[12px] font-semibold">{m.label}</div>
                              {m.description && <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{m.description}</div>}
                            </div>
                            
                            {m.valueType === "boolean" && (
                              <button
                                type="button"
                                onClick={() => setInternalScores(prev => ({ ...prev, [m.id]: score === 1 ? 0 : 1 }))}
                                className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition`}
                                style={{ 
                                  background: score === 1 ? "var(--color-status-done)" : "var(--surface-2)",
                                  color: score === 1 ? "#fff" : "var(--text-2)"
                                }}
                              >
                                {score === 1 ? "Met" : "Not Met"}
                              </button>
                            )}

                            {m.valueType === "rating_5" && (
                              <span className="font-data text-[11px] font-bold" style={{ color: "var(--accent)" }}>{score} / 5</span>
                            )}

                            {m.valueType === "rating_10" && (
                              <span className="font-data text-[11px] font-bold" style={{ color: "var(--accent)" }}>{score} / 10</span>
                            )}

                            {m.valueType === "percentage" && (
                              <span className="font-data text-[11px] font-bold" style={{ color: "var(--accent)" }}>{score}%</span>
                            )}
                          </div>

                          {m.valueType === "rating_5" && (
                            <div className="flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                              {Array.from({ length: 5 }).map((_, idx) => {
                                const starVal = idx + 1;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setInternalScores(prev => ({ ...prev, [m.id]: starVal }))}
                                    className="transition hover:scale-110"
                                  >
                                    <Star 
                                      className="h-4.5 w-4.5" 
                                      style={{ 
                                        fill: starVal <= score ? "var(--color-status-reserved)" : "none", 
                                        color: starVal <= score ? "var(--color-status-reserved)" : "var(--border)" 
                                      }} 
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {m.valueType === "rating_10" && (
                            <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
                              <input 
                                type="range" 
                                min="0" 
                                max="10" 
                                step="0.5"
                                value={score} 
                                onChange={(e) => setInternalScores(prev => ({ ...prev, [m.id]: parseFloat(e.target.value) || 0 }))}
                                className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]" 
                              />
                            </div>
                          )}

                          {m.valueType === "percentage" && (
                            <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="1"
                                value={score} 
                                onChange={(e) => setInternalScores(prev => ({ ...prev, [m.id]: parseInt(e.target.value) || 0 }))}
                                className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]" 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Evaluator Notes
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Summarize setup/teardown details, structural rigidity, or any component malfunctions..."
                  className="mt-1 h-20 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px]" 
                  style={{ borderColor: "var(--border)" }} 
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  const scoresList = Object.entries(internalScores).map(([metricId, score]) => ({
                    metricId,
                    score,
                  }));
                  submitInternal({
                    assignmentId: `assign-${booking.code}`,
                    clientNameVenue: venueName,
                    eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
                    teamSize,
                    notes,
                    scores: scoresList,
                  });
                }}
                disabled={submittingInternal}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {submittingInternal ? "Submitting..." : "Submit Evaluation"}
              </button>
              <button 
                onClick={() => setShowInternalModal(false)} 
                className="rounded border px-4 py-2 text-[12px]" 
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

type B = Booking;

function Section({ title, icon: I, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border relative overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <I className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="label-eyebrow">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AccessLockOverlay({ sectionName, permissionKey }: { sectionName: string; permissionKey: string }) {
  const [requested, setRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      await requestPermissionApi(permissionKey, `Requested view/edit access for ${sectionName}`);
      setRequested(true);
      toast.success(`Access request for "${permissionKey}" sent to administrators!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-[6px] p-4 text-center select-none"
      style={{ background: "rgba(18, 18, 18, 0.75)" }}
    >
      <div className="rounded-full bg-[var(--surface)] border p-3 shadow-lg mb-3" style={{ borderColor: "var(--border)" }}>
        <Lock className="h-6 w-6 text-amber-500 animate-pulse" />
      </div>
      <div className="text-[13px] font-bold">Access Restricted</div>
      <p className="text-[11px] text-[var(--text-2)] max-w-[240px] mt-1 mb-4 leading-relaxed">
        You do not have permission to view or manage the {sectionName} section.
      </p>
      <button
        disabled={requested || isSubmitting}
        onClick={handleRequest}
        className="rounded-md border px-4 py-2 text-[11px] font-bold tracking-wide transition hover:brightness-110 shadow-md disabled:opacity-50"
        style={{ 
          borderColor: "var(--border)", 
          background: requested ? "color-mix(in oklab, var(--accent) 10%, var(--surface))" : "var(--accent)", 
          color: requested ? "var(--color-bom-returned)" : "var(--accent-foreground)" 
        }}
      >
        {isSubmitting ? "Sending..." : requested ? "✓ Request Sent to Admin" : "Request Permission from Admin"}
      </button>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{k}</span>
      <span className={`text-[13px] font-medium text-right ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function OverviewTab({ b }: { b: B }) {
  const { code } = _Route.useParams();
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const userRole = authUser?.role?.toLowerCase() || "";
  const isCtoOrAdmin = userRole === "admin" || userRole === "chief_tech";
  const isTechnician = userRole === "technician";

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

  const hasTechnicalHolds = !!b.ctoNotes || (reservationsRes?.reservations && reservationsRes.reservations.length > 0);
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
          getInventoryPoolsApi()
        ]);
        const screenCat = cats.find(c => c.key === "screen" || c.name === "LED Screen Modules");
        if (screenCat) {
          setScreenPools(pools.filter(p => p.categoryId === screenCat.id));
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
        quantity: parseFloat(r.quantity) || 0
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
          results.forEach(r => {
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
    return () => { active = false; };
  }, [b.assemblyDate, b.eventDate, screenPools]);

  // Fetch staff
  useEffect(() => {
    getStaffApi()
      .then(setStaffList)
      .catch((err: any) => {
        console.error("Failed to load staff", err);
        if (err.status === 403) {
          setIsStaffRestricted(true);
        }
      });
  }, []);

  const handleSaveTechnical = async () => {
    const validAllocations = allocations.filter(a => a.poolId && a.quantity > 0);
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
        await Promise.all(res.reservations.map((r: any) => 
          deleteReservationApi(b.id, r.id)
        ));
      }

      // 2. Create new holds
      await Promise.all(validAllocations.map(a => 
        createReservationApi(b.id, { poolId: a.poolId, quantity: String(a.quantity) })
      ));

      // 3. Update CTO notes and include spec only when screens are selected
      const bookingPayload: Record<string, string> = {
        ctoConsultationNotes: ctoNotes,
      };
      if (validAllocations.length > 0) {
        bookingPayload.itemServiceSpec = validAllocations.map(a => {
          const p = screenPools.find(sp => sp.id === a.poolId);
          return `${a.quantity}sqm of ${p ? p.name : "LED Screen"}`;
        }).join(", ");
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
    const validTechs = assignedTechs.filter(id => id);
    if (validTechs.length === 0) {
      toast.error("Please select at least one technician to assign.");
      return;
    }
    setIsAssigningStaff(true);
    try {
      if (authUser?.id) {
        await createAssignmentApi(b.id, {
          userId: authUser.id,
          roleContext: 'TECHNICIAN',
          isTeamLead: true
        });
      }

      await Promise.all(validTechs.map(techId => 
        createAssignmentApi(b.id, {
          userId: techId,
          roleContext: 'TECHNICIAN',
          isTeamLead: false
        })
      ));

      toast.success("Technician assignment completed!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign crew");
    } finally {
      setIsAssigningStaff(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8 space-y-4">
        {/* Stage 1: CTO Technical Allocation (Visible to chief_tech / admin when status is RESERVED) */}
        {/* Stage 1: CTO Technical Allocation (Visible when status is RESERVED) */}
        {b.status === "RESERVED" && (
          <>
            {isCtoOrAdmin ? (
              isEditingHolds ? (
                <Section title="Technical Hold Allocation (Chief Tech Review)" icon={Wrench}>
                  {(isPoolsRestricted || isReservationsRestricted) && <AccessLockOverlay sectionName="Technical Holds Allocation" permissionKey="bom.create" />}
                  <div className="space-y-4">
                    <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                      Specify screen type holds and check live warehouse availability for this event. 
                      Dates: <strong className="font-mono text-xs">{b.assemblyDate} to {b.dismantleDate}</strong>.
                    </p>

                    {/* Multi-screen hold rows */}
                    <div className="space-y-3">
                      {allocations.map((alloc, idx) => {
                        const selectedPool = screenPools.find(p => p.id === alloc.poolId);
                        const avail = selectedPool ? (screenAvailabilities[selectedPool.sku || selectedPool.name] ?? 0) : null;
                        return (
                          <div key={idx} className="flex items-end gap-3 rounded border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                            <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                              Screen Type
                              <select
                                value={alloc.poolId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations(prev => prev.map((a, i) => i === idx ? { ...a, poolId: val } : a));
                                }}
                                className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <option value="">— Select Screen —</option>
                                {screenPools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </label>

                            <label className="w-28 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                              Quantity (sqm)
                              <input
                                type="number"
                                value={alloc.quantity || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setAllocations(prev => prev.map((a, i) => i === idx ? { ...a, quantity: val } : a));
                                }}
                                placeholder="qty"
                                className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                                style={{ borderColor: "var(--border)" }}
                              />
                            </label>

                            {alloc.poolId && (
                              <div className="mb-2 text-[11px] text-right shrink-0">
                                <span style={{ color: "var(--text-3)" }}>Avail: </span>
                                <strong style={{ color: (avail && avail > 10) ? "var(--color-bom-returned)" : "var(--color-pay-advance)" }}>
                                  {avail !== null ? `${avail} sqm` : "Checking..."}
                                </strong>
                              </div>
                            )}

                            {allocations.length > 1 && (
                              <button
                                onClick={() => setAllocations(prev => prev.filter((_, i) => i !== idx))}
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
                      onClick={() => setAllocations(prev => [...prev, { poolId: "", quantity: 0 }])}
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
                      <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Allocated Equipment</div>
                      <div className="grid grid-cols-2 gap-2">
                        {allocations.filter(a => a.poolId).map((alloc, idx) => {
                          const p = screenPools.find(sp => sp.id === alloc.poolId);
                          return (
                            <div key={idx} className="flex justify-between border-b py-1 text-[13px]" style={{ borderColor: "var(--border)" }}>
                              <span>{p ? p.name : "LED Screen"}</span>
                              <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {b.ctoNotes && (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">CTO Consultation Notes</div>
                        <p className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border" style={{ borderColor: "var(--border)" }}>
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
                    <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Allocated Equipment</div>
                    <div className="grid grid-cols-2 gap-2">
                      {allocations.filter(a => a.poolId).map((alloc, idx) => {
                        const p = screenPools.find(sp => sp.id === alloc.poolId);
                        return (
                          <div key={idx} className="flex justify-between border-b py-1 text-[13px]" style={{ borderColor: "var(--border)" }}>
                            <span>{p ? p.name : "LED Screen"}</span>
                            <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {b.ctoNotes && (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">CTO Consultation Notes</div>
                      <p className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border" style={{ borderColor: "var(--border)" }}>
                        {b.ctoNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            ) : (
              <Section title="Technical Hold Allocation" icon={Wrench}>
                <div className="flex items-center gap-2.5 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-[12px]" style={{ color: "var(--color-pay-advance)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Awaiting technical hold allocation and notes by Chief Technical Officer.</span>
                </div>
              </Section>
            )}
          </>
        )}

        {/* Stage 2: CTO Crew Assignment (Visible to chief_tech / admin when status is CONFIRMED) */}
        {isCtoOrAdmin && b.status === "CONFIRMED" && (
          <Section title="Assign Lead Crew (Chief Tech Review)" icon={Users}>
            {isStaffRestricted && <AccessLockOverlay sectionName="Crew Assignment" permissionKey="user.manage" />}
            <div className="space-y-4">
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                Assign the technicians to manage this event deployment. You will be automatically assigned as the Chief Technician.
              </p>

              <div className="space-y-3">
                {assignedTechs.map((techId, idx) => (
                  <div key={idx} className="flex items-end gap-3 rounded border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                    <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Technician #{idx + 1}
                      <select
                        value={techId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedTechs(prev => prev.map((t, i) => i === idx ? val : t));
                        }}
                        className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <option value="">— Select Technician —</option>
                        {staffList
                          .filter((s) => s.role.toLowerCase() === "technician" || s.role.toLowerCase() === "to")
                          .map((s) => (
                            <option key={s.id} value={s.id} disabled={assignedTechs.includes(s.id) && s.id !== techId}>
                              {s.name}
                            </option>
                          ))
                        }
                      </select>
                    </label>

                    {assignedTechs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAssignedTechs(prev => prev.filter((_, i) => i !== idx))}
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
                  onClick={() => setAssignedTechs(prev => [...prev, ""])}
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

        <Section title="Client & Contact" icon={User}>
          <div className="grid grid-cols-2 gap-x-6">
            <KV k="Client" v={b.client} />
            <KV k="Contact Person" v={b.contactPerson} />
            <KV k="Phone" v={<span className="flex items-center justify-end gap-1.5"><Phone className="h-3 w-3" />{b.contactPhone}</span>} mono />
            <KV k="Booking Code" v={b.code} mono />
          </div>
        </Section>

        <Section title="Venue & Setup" icon={MapPin}>
          <div className="grid grid-cols-2 gap-x-6">
            <KV k="Venue" v={b.venue} />
            <KV k="Arrangement" v={b.arrangement} mono />
            <KV k="Screen Type" v={b.screenType} mono />
            <KV k="Size (sqm)" v={b.size} mono />
          </div>
        </Section>

        {!isTechnician && (
          <Section title="Logistics & Team" icon={Truck}>
            <div className="grid grid-cols-2 gap-x-6">
              <KV k="Team Leader" v={b.teamLeader} />
              <KV k="Stage Hand" v={b.stageHand} />
              <KV k="Driver" v={b.driver} />
              <KV k="Meal Budget" v={`ETB ${b.mealBudget.toLocaleString()}`} mono />
            </div>
          </Section>
        )}

        <Section title="Notes & Special Requirements" icon={MessageSquare}>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {b.ctoNotes || "No special requirements noted. Coordinate with venue AV for power distribution."}
          </p>
        </Section>
      </div>

      <div className="col-span-4 space-y-4">
        <Section title="Schedule" icon={Calendar}>
          <KV k="Assembly" v={b.assemblyDate} mono />
          <KV k="Event" v={b.eventDate} mono />
          <KV k="Dismantle" v={b.dismantleDate} mono />
        </Section>

        {!isTechnician && (
          <Section title="Financial" icon={DollarSign}>
            <KV k="Contract" v={`ETB ${b.amount.toLocaleString()}`} mono />
            <KV k="Paid" v={b.payment === "PAID" ? `ETB ${b.amount.toLocaleString()}` : b.payment === "ADVANCE" ? `ETB ${(b.amount / 2).toLocaleString()}` : "ETB 0"} mono />
            <KV k="Balance" v={b.payment === "PAID" ? "ETB 0" : `ETB ${(b.amount / 2).toLocaleString()}`} mono />
            <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <KV k="Status" v={<PaymentBadge status={b.payment} />} />
            </div>
          </Section>
        )}

        <Section title="Quick Stats" icon={CheckCircle2}>
          <KV k="Days to Event" v={Math.max(0, Math.ceil((new Date(b.eventDate).getTime() - Date.now()) / 86400000))} mono />
          <KV k="Crew Size" v={b.assignees.length + 4} mono />
          <KV k="BOM Items" v={b.bomItems.length} mono />
          <KV k="Created" v={b.createdAt} mono />
        </Section>
      </div>
    </div>
  );
}

function ScheduleTab({ b }: { b: B }) {
  const events = [
    { t: "07:00", title: "Load Out from Warehouse", who: "Storekeeper · Storeroom A", icon: Truck },
    { t: "09:30", title: "Arrive at Venue", who: b.venue, icon: MapPin },
    { t: "10:00", title: "Assembly Start", who: b.assignees.join(" · "), icon: Wrench, date: b.assemblyDate },
    { t: "16:00", title: "Test Run & Calibration", who: "Chief Technician", icon: CheckCircle2 },
    { t: "18:00", title: "Live Event", who: b.client, icon: Users, date: b.eventDate, accent: true },
    { t: "23:30", title: "Dismantle", who: b.stageHand, icon: Wrench, date: b.dismantleDate },
    { t: "00:30", title: "Material Return & Check-in", who: "Storekeeper", icon: PackageCheck },
  ];
  return (
    <Section title="Timeline" icon={Clock}>
      <div className="relative space-y-3">
        <div className="absolute bottom-0 left-[44px] top-2 w-px" style={{ background: "var(--border)" }} />
        {events.map((e, i) => (
          <div key={i} className="relative flex items-start gap-4">
            <div className="w-10 pt-2 text-right font-mono text-[11px] font-bold" style={{ color: e.accent ? "var(--accent)" : "var(--text-2)" }}>{e.t}</div>
            <div
              className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: e.accent ? "var(--accent)" : "var(--border)",
                background: e.accent ? "color-mix(in oklab, var(--accent) 20%, transparent)" : "var(--surface-2)",
                color: e.accent ? "var(--accent)" : "var(--text-2)",
              }}
            >
              <e.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 rounded-md border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold">{e.title}</div>
                {e.date && <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>{e.date}</span>}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TeamTab({ b }: { b: B }) {
  const roster = [
    { role: "Chief Technician", name: b.assignees[0], status: "ACCEPTED" },
    { role: "Technician", name: b.assignees[1], status: "ACCEPTED" },
    { role: "Operation Officer", name: "Eyob D.", status: "ASSIGNED" },
    { role: "Team Leader", name: b.teamLeader, status: "CONFIRMED" },
    { role: "Stage Hand Team", name: b.stageHand, status: "CONFIRMED" },
    { role: "Driver", name: b.driver, status: "CONFIRMED" },
    { role: "CCR", name: "Selam M.", status: "CONFIRMED" },
  ];
  return (
    <Section title="Assigned Team" icon={Users} action={<button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>+ Assign Member</button>}>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {roster.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                {(p.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13px] font-semibold">{p.name}</div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{p.role}</div>
              </div>
            </div>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: p.status === "ACCEPTED" ? "var(--color-status-accepted)" : "var(--color-status-confirmed)",
                borderColor: "var(--border)",
              }}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EquipmentTab({ b }: { b: B }) {
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const userRole = authUser?.role?.toLowerCase() || "";
  const isCtoOrAdmin = userRole === "admin" || userRole === "chief_tech";
  const isTechnician = userRole === "technician";

  const isEditable = isCtoOrAdmin || (isTechnician && b.status === "ACCEPTED");

  // Local state for adding items
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [addQty, setAddQty] = useState(1);

  // Queries
  const { data: pools = [] } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
    enabled: isEditable,
  });

  // Mutations
  const { mutate: addBomLine, isPending: addingLine } = useMutation({
    mutationFn: ({ poolId, quantity }: { poolId: string; quantity: number }) => 
      createBomLineApi(b.id, poolId, quantity),
    onSuccess: () => {
      toast.success("Item added to BOM");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      setSelectedPoolId("");
      setAddQty(1);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add item to BOM");
    }
  });

  const { mutate: updateBomLine, isPending: updatingLine } = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => 
      updateBomLineApi(b.id, lineId, quantity),
    onSuccess: () => {
      toast.success("BOM quantity updated");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update quantity");
    }
  });

  const { mutate: deleteBomLine, isPending: deletingLine } = useMutation({
    mutationFn: (lineId: string) => 
      deleteBomLineApi(b.id, lineId),
    onSuccess: () => {
      toast.success("Item removed from BOM");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove item");
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolId) {
      toast.error("Please select an item pool");
      return;
    }
    if (addQty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }
    addBomLine({ poolId: selectedPoolId, quantity: addQty });
  };

  return (
    <div className="space-y-4">
      {isEditable && (
        <Section title="BOM Creator - Add Item" icon={Package}>
          <form onSubmit={handleAddItem} className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-2)" }}>
                Select Equipment / Pool
              </label>
              <select
                value={selectedPoolId}
                onChange={(e) => setSelectedPoolId(e.target.value)}
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">-- Choose Equipment --</option>
                {pools.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category || "General"})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-32">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-2)" }}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] text-right font-mono"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button
              type="submit"
              disabled={addingLine}
              className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 h-9 flex items-center gap-1.5 shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Add to BOM
            </button>
          </form>
        </Section>
      )}

      <Section title="Bill of Materials" icon={Package}>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="label-eyebrow pb-2 text-left">Line ID</th>
              <th className="label-eyebrow pb-2 text-left">Item Name</th>
              <th className="label-eyebrow pb-2 text-right">Quantity</th>
              {isEditable && <th className="label-eyebrow pb-2 text-center w-24">Actions</th>}
              <th className="label-eyebrow pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {b.bomItems.length === 0 ? (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                  No items in Bill of Materials. Add items using the BOM Creator above.
                </td>
              </tr>
            ) : (
              b.bomItems.map((it) => (
                <tr key={it.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>{it.id}</td>
                  <td className="py-3">{it.name}</td>
                  <td className="py-3 text-right">
                    {isEditable ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateBomLine({ lineId: it.id, quantity: Math.max(1, it.qty - 1) })}
                          disabled={updatingLine || it.qty <= 1}
                          className="h-6 w-6 rounded border bg-[var(--surface-2)] flex items-center justify-center text-[12px] transition hover:border-[var(--accent)] disabled:opacity-30"
                          style={{ borderColor: "var(--border)" }}
                        >
                          -
                        </button>
                        <span className="font-mono font-semibold w-10 text-center">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateBomLine({ lineId: it.id, quantity: it.qty + 1 })}
                          disabled={updatingLine}
                          className="h-6 w-6 rounded border bg-[var(--surface-2)] flex items-center justify-center text-[12px] transition hover:border-[var(--accent)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-semibold">{it.qty}</span>
                    )}
                  </td>
                  {isEditable && (
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${it.name} from the BOM?`)) {
                            deleteBomLine(it.id);
                          }
                        }}
                        disabled={deletingLine}
                        className="text-destructive hover:scale-110 transition p-1"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <span className="rounded-md border px-2 py-0.5 text-[10px] font-bold" style={{
                      borderColor: "var(--border)",
                      color: it.status === "Returned" ? "var(--color-bom-returned)" : it.status === "Checked Out" ? "var(--color-bom-checkedout)" : "var(--text-2)",
                    }}>
                      {it.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--text-3)" }}>{b.bomItems.length} items · {b.bomItems.reduce((s, i) => s + i.qty, 0)} total units</span>
          <button className="rounded-md border px-3 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Print Packing Slip
          </button>
        </div>
      </Section>
    </div>
  );
}

function PaymentsTab({ b }: { b: B }) {
  const tx = b.payment === "PAID"
    ? [{ d: "2026-05-12", n: "Full payment", a: b.amount, m: "Bank Transfer" }]
    : b.payment === "ADVANCE"
    ? [{ d: "2026-05-12", n: "Advance 50%", a: b.amount / 2, m: "Bank Transfer" }]
    : [];
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        <Section title="Transactions" icon={DollarSign} action={<button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>+ Record Payment</button>}>
          {tx.length === 0 ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>No payments recorded yet.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="label-eyebrow pb-2 text-left">Date</th>
                  <th className="label-eyebrow pb-2 text-left">Note</th>
                  <th className="label-eyebrow pb-2 text-left">Method</th>
                  <th className="label-eyebrow pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 font-mono">{t.d}</td>
                    <td className="py-3">{t.n}</td>
                    <td className="py-3" style={{ color: "var(--text-2)" }}>{t.m}</td>
                    <td className="py-3 text-right font-mono font-semibold">ETB {t.a.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
      <div className="col-span-4">
        <Section title="Summary" icon={DollarSign}>
          <KV k="Contract" v={`ETB ${b.amount.toLocaleString()}`} mono />
          <KV k="Paid" v={`ETB ${tx.reduce((s, t) => s + t.a, 0).toLocaleString()}`} mono />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV k="Balance Due" v={`ETB ${(b.amount - tx.reduce((s, t) => s + t.a, 0)).toLocaleString()}`} mono />
          </div>
        </Section>
      </div>
    </div>
  );
}

function FilesTab({ b }: { b: any }) {
  const queryClient = useQueryClient();
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [isDragActive, setIsDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload Progress States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");

  // Queries & Mutations
  const { data: attachments, isLoading } = useQuery({
    queryKey: ["booking-attachments", b.id],
    queryFn: () => getBookingAttachmentsApi(b.id),
  });

  const { mutate: uploadFile } = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadingFileName(file.name);
      setUploadProgress(0);

      let uploadUrl = "";
      let objectKey = "";

      try {
        // Step 1: Request presigned S3/MinIO upload URL
        const res = await getUploadUrlApi(b.id, {
          fileName: file.name,
          fileType: file.type || "application/octet-stream"
        });
        uploadUrl = res.uploadUrl;
        objectKey = res.objectKey;
      } catch (e) {
        const mockUuid = Math.random().toString(36).substr(2, 9);
        uploadUrl = `mock://vortex-s3.local/attachments/${b.code}/${mockUuid}_${file.name}`;
        objectKey = `attachments/${b.code}/${mockUuid}_${file.name}`;
      }

      try {
        // Step 2: PUT file directly to storage endpoint
        await uploadFileDirectApi(uploadUrl, file, (percent) => {
          setUploadProgress(percent);
        });
      } catch (err) {
        console.warn("Direct S3 upload failed (likely MinIO is offline). Falling back to mock S3 simulator.", err);
        // Fallback: convert the URL to a mock URL and upload
        const mockUuid = Math.random().toString(36).substr(2, 9);
        const fallbackUrl = `mock://vortex-s3.local/attachments/${b.code}/${mockUuid}_${file.name}`;
        objectKey = `attachments/${b.code}/${mockUuid}_${file.name}`;
        
        await uploadFileDirectApi(fallbackUrl, file, (percent) => {
          setUploadProgress(percent);
        });
      }

      // Step 3: Confirm upload metadata with NestJS backend
      return await confirmUploadApi(b.id, {
        objectKey,
        originalName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSizeBytes: file.size
      });
    },
    onSuccess: () => {
      toast.success("File attached successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", b.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload file attachment");
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadingFileName("");
      setUploadProgress(0);
    }
  });

  const { mutate: deleteAttachment, isPending: deleting } = useMutation({
    mutationFn: deleteAttachmentApi,
    onSuccess: () => {
      toast.success("Attachment deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", b.id] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete attachment");
    }
  });

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size exceeds the 20MB limit.");
        return;
      }
      uploadFile(file);
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      const { downloadUrl } = await getDownloadUrlApi(att.id);
      if (downloadUrl && downloadUrl !== "#") {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Unable to generate preview/download URL");
      }
    } catch {
      toast.error("Failed to fetch download token");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    const m = mime.toLowerCase();
    if (m.includes("pdf")) return <FileText className="h-7 w-7 text-red-400" />;
    if (m.includes("image/")) return <Image className="h-7 w-7 text-emerald-400" />;
    if (m.includes("zip") || m.includes("tar") || m.includes("rar") || m.includes("compressed")) {
      return <FileArchive className="h-7 w-7 text-amber-400" />;
    }
    if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) {
      return <FileText className="h-7 w-7 text-emerald-500" />;
    }
    return <File className="h-7 w-7 text-zinc-400" />;
  };

  // Filter attachments list
  const filteredList = attachments?.filter((att) => {
    if (entityFilter === "all") return true;
    if (entityFilter === "general") return !att.relatedEntity;
    return att.relatedEntity === entityFilter;
  }) || [];

  return (
    <Section title="Files & Attachments" icon={Paperclip}>
      <div className="space-y-4">
        {/* Upload Interface and Active Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-all ${
                isDragActive 
                  ? "border-[var(--accent)] bg-[var(--surface-2)] scale-[0.99]" 
                  : "border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-2)]"
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    if (file.size > 20 * 1024 * 1024) {
                      toast.error("File size exceeds the 20MB limit.");
                      return;
                    }
                    uploadFile(file);
                  }
                }}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer block">
                <Upload className="mx-auto h-8 w-8 mb-2 text-[var(--accent)] hover:scale-110 transition duration-200" />
                <span className="text-[13px] font-bold block">
                  Drag & Drop files here, or <span style={{ color: "var(--accent)" }}>browse</span>
                </span>
                <span className="text-[10px] block mt-1" style={{ color: "var(--text-3)" }}>
                  Supports PDFs, images, spreadsheets, and archives up to 20MB.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-3">
            {isUploading ? (
              <div className="rounded-md border p-3.5 space-y-2 bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 truncate">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                    Uploading {uploadingFileName}...
                  </span>
                  <span className="font-mono text-[var(--accent)]">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300 bg-[var(--accent)]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-4 bg-[var(--surface-2)] text-[11.5px] leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                <div className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>🔒 Double-Hop S3 Upload</div>
                Files stream directly from your browser to our secure storage bucket, bypassing backend memory to guarantee performance.
              </div>
            )}
          </div>
        </div>

        {/* Files Repository Section */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <span className="label-eyebrow text-[10px]">Files Repository</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span style={{ color: "var(--text-3)" }}>Filter:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="rounded border bg-[var(--surface-2)] px-2 py-0.5"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="all">All Attachments</option>
                <option value="general">General Files</option>
                <option value="damage_report">Damage Reports</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>Loading files...</div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center border border-dashed rounded-lg" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <Paperclip className="h-8 w-8 mx-auto mb-2 text-zinc-500" />
              <div className="text-[13px] font-semibold">No Attachments Found</div>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                Use the dropzone above to link documents to this booking.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredList.map((f) => (
                <div
                  key={f.id}
                  className="group relative flex items-start gap-3 rounded-lg border p-3.5 transition duration-200 hover:border-[var(--accent)] bg-[var(--surface-2)] hover:bg-[var(--surface)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="mt-0.5 shrink-0">{getFileIcon(f.fileType)}</div>
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="truncate text-[12.5px] font-bold" title={f.originalName}>
                      {f.originalName}
                    </div>
                    <div className="text-[10px] mt-1 space-y-0.5" style={{ color: "var(--text-3)" }}>
                      <div>{formatBytes(f.fileSizeBytes)}</div>
                      <div>Uploaded by {f.uploaderName || "User"}</div>
                      <div>{new Date(f.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Hover Action Overlay */}
                  <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleDownload(f)}
                      title="Download File"
                      className="rounded p-1 hover:bg-[var(--surface-2)] transition"
                      style={{ color: "var(--accent)" }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(f.id)}
                      title="Delete File"
                      className="rounded p-1 hover:bg-red-500/10 transition"
                      style={{ color: "var(--destructive)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h4 className="text-[14px] font-bold text-[var(--destructive)] mb-2">Permanently Delete Attachment</h4>
            <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-2)" }}>
              Are you sure you want to delete this file? This action is permanent and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                disabled={deleting}
                onClick={() => deleteAttachment(deletingId)}
                className="rounded px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--destructive)] hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="rounded border px-3 py-1.5 text-[11px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function ActivityTab({ b }: { b: B }) {
  const log = b.statusHistory || [];
  return (
    <Section title="Activity Log" icon={Clock}>
      <div className="space-y-4">
        {log.map((l, i) => (
          <div key={i} className="flex items-start gap-3 text-[12px] border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{l.actorName}</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                  {new Date(l.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mt-1" style={{ color: "var(--text-2)" }}>
                Changed status to <span className="font-semibold px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  {STATUS_LABELS[l.toStatus as BookingStatus] || l.toStatus}
                </span>
                {l.fromStatus && (
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {" "}(from {STATUS_LABELS[l.fromStatus as BookingStatus] || l.fromStatus})
                  </span>
                )}
              </div>
              {l.reason && (
                <div className="mt-1.5 rounded border p-2 text-[11px] italic animate-fade-in" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-3)" }}>
                  "{l.reason}"
                </div>
              )}
            </div>
          </div>
        ))}
        {log.length === 0 && (
          <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
            No status activities logged yet.
          </div>
        )}
      </div>
    </Section>
  );
}

function EvaluationsTab({ b, openInternalForm }: { b: B; openInternalForm: () => void }) {
  const queryClient = useQueryClient();
  const [activeProfile] = useActiveProfile();
  
  const canSubmitInternal = ["Admin", "CTO", "TO"].includes(activeProfile.role);

  // States
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // Client Evaluation Form States
  const [respondentName, setRespondentName] = useState("");
  const [clientScores, setClientScores] = useState<Record<string, number>>({});

  // Queries
  const { data: internalEval, isLoading: loadingInternal } = useQuery({
    queryKey: ["booking-internal-eval", b.code],
    queryFn: () => getInternalEvaluationApi(b.code),
    retry: false,
  });

  const { data: clientEval, isLoading: loadingClient } = useQuery({
    queryKey: ["booking-client-eval", b.code],
    queryFn: () => getClientEvaluationApi(b.code),
    retry: false,
  });

  const { data: metrics } = useQuery({
    queryKey: ["active-metrics"],
    queryFn: () => listPerformanceMetricsApi({ isActive: true }),
  });

  // Filter metrics
  const clientMetrics = metrics?.filter((m) => m.category === "client_feedback") || [];

  // Mutations
  const { mutate: simulateWebhook, isPending: submittingWebhook } = useMutation({
    mutationFn: (payload: SubmitClientEvaluationPayload) => submitClientEvaluationApi(b.code, payload),
    onSuccess: () => {
      toast.success("Client feedback simulated via webhook!");
      queryClient.invalidateQueries({ queryKey: ["booking-client-eval", b.code] });
      setShowWebhookModal(false);
      setRespondentName("");
      setClientScores({});
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to simulate client feedback");
    }
  });

  const openClientForm = () => {
    const initialScores: Record<string, number> = {};
    clientMetrics.forEach((m) => {
      initialScores[m.key] = m.valueType === "boolean" ? 1 
                           : m.valueType === "rating_5" ? 5 
                           : m.valueType === "percentage" ? 100 
                           : 10;
    });
    setClientScores(initialScores);
    setRespondentName("");
    setShowWebhookModal(true);
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Internal Evaluation */}
      <div className="col-span-12 md:col-span-6">
        <Section 
          title="Internal Crew Review" 
          icon={ClipboardCheck}
          action={
            !loadingInternal && !internalEval && canSubmitInternal && (
              <button 
                onClick={openInternalForm}
                className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold transition hover:border-[var(--accent)]" 
                style={{ borderColor: "var(--border)", color: "var(--accent)" }}
              >
                + Submit Review
              </button>
            )
          }
        >
          {loadingInternal ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>Loading review...</div>
          ) : internalEval ? (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
                  <span>Evaluated by: <strong style={{ color: "var(--foreground)" }}>{internalEval.evaluatorId}</strong></span>
                  <span className="font-mono">{new Date(internalEval.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div><span style={{ color: "var(--text-3)" }}>Client/Venue:</span> {internalEval.clientNameVenue || b.venue}</div>
                  <div><span style={{ color: "var(--text-3)" }}>Team Size:</span> {internalEval.teamSize || b.assignees.length + 2} crew</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="label-eyebrow text-[10px]">Operations Checklist</span>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {internalEval.scores.map((s) => (
                    <div key={s.metricId} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-[13px] font-semibold">{s.label}</div>
                        {s.description && <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{s.description}</div>}
                      </div>

                      {/* Render display dynamically based on valueType */}
                      {s.valueType === "boolean" && (
                        <span 
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold`}
                          style={{ 
                            background: s.score === 1 ? "rgba(48, 164, 108, 0.15)" : "rgba(229, 70, 102, 0.15)",
                            color: s.score === 1 ? "var(--color-status-done)" : "var(--destructive)",
                            border: `1px solid ${s.score === 1 ? "rgba(48, 164, 108, 0.3)" : "rgba(229, 70, 102, 0.3)"}`
                          }}
                        >
                          {s.score === 1 ? (
                            <>
                              <Check className="h-3 w-3" /> Met
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" /> Not Met
                            </>
                          )}
                        </span>
                      )}

                      {s.valueType === "rating_5" && (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className="h-3.5 w-3.5" 
                                style={{ 
                                  fill: idx < Math.round(s.score) ? "var(--color-status-reserved)" : "none", 
                                  color: idx < Math.round(s.score) ? "var(--color-status-reserved)" : "var(--border)" 
                                }} 
                              />
                            ))}
                          </div>
                          <span className="font-data font-bold text-[11px] ml-1.5" style={{ color: "var(--text-2)" }}>{s.score} / 5</span>
                        </div>
                      )}

                      {s.valueType === "rating_10" && (
                        <span className="font-data font-bold text-[12px]" style={{ color: "var(--accent)" }}>{s.score} / 10</span>
                      )}

                      {s.valueType === "percentage" && (
                        <span className="font-data font-bold text-[12px]" style={{ color: "var(--accent)" }}>{s.score}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {internalEval.notes && (
                <div className="rounded-md border p-3 bg-[var(--surface)] text-[12px] leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                  <div className="flex items-center gap-1.5 label-eyebrow mb-1.5 text-[9px]">
                    <MessageSquare className="h-3 w-3" style={{ color: "var(--accent)" }} /> Evaluator Notes
                  </div>
                  {internalEval.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <ClipboardCheck className="h-8 w-8 mb-2" style={{ color: "var(--text-3)" }} />
              <div className="text-[13px] font-semibold">No Internal Review Submitted</div>
              <p className="mt-1 max-w-[280px] text-[11px] px-4" style={{ color: "var(--text-3)" }}>
                Technicians and administrators can complete the operations review for safety, PPE compliance, and load-in efficiency.
              </p>
              {canSubmitInternal && (
                <button 
                  onClick={openInternalForm}
                  className="mt-4 rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  Start Crew Review
                </button>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Client Feedback */}
      <div className="col-span-12 md:col-span-6">
        <Section 
          title="Client Satisfaction Review" 
          icon={Star}
          action={
            !loadingClient && !clientEval && (
              <button 
                onClick={openClientForm}
                className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold transition hover:border-[var(--accent)]" 
                style={{ borderColor: "var(--border)", color: "var(--accent)" }}
              >
                Simulate Webhook
              </button>
            )
          }
        >
          {loadingClient ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>Loading feedback...</div>
          ) : clientEval ? (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
                  <span>Respondent: <strong style={{ color: "var(--foreground)" }}>{clientEval.respondentName}</strong></span>
                  <span className="font-mono">{new Date(clientEval.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  Ingested automatically via Google Forms Webhook API
                </div>
              </div>

              <div className="space-y-4">
                <span className="label-eyebrow text-[10px]">Client Survey Results</span>
                <div className="space-y-3.5">
                  {clientEval.scores.map((s) => {
                    // Decide color dynamically
                    const colorScore = s.valueType === "rating_5" ? s.score * 2 : s.score;
                    const scoreColor = colorScore >= 8 ? "var(--color-status-done)" : colorScore >= 5 ? "var(--color-status-reserved)" : "var(--destructive)";
                    
                    // Progress Bar width percentage
                    let progressWidth = "0%";
                    if (s.valueType === "boolean") progressWidth = s.score === 1 ? "100%" : "0%";
                    else if (s.valueType === "rating_5") progressWidth = `${s.score * 20}%`;
                    else if (s.valueType === "percentage") progressWidth = `${s.score}%`;
                    else progressWidth = `${s.score * 10}%`; // rating_10

                    return (
                      <div key={s.metricId} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-semibold">{s.label}</span>
                            {s.description && <span className="ml-2 text-[10px]" style={{ color: "var(--text-3)" }}>({s.description})</span>}
                          </div>
                          
                          <span className="font-data text-[12px] font-bold" style={{ color: scoreColor }}>
                            {s.valueType === "boolean" ? (s.score === 1 ? "Met" : "Not Met")
                             : s.valueType === "rating_5" ? `${s.score} / 5`
                             : s.valueType === "percentage" ? `${s.score}%`
                             : `${s.score} / 10`}
                          </span>
                        </div>

                        {s.valueType === "rating_5" ? (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className="h-4.5 w-4.5" 
                                style={{ 
                                  fill: idx < Math.round(s.score) ? "var(--color-status-reserved)" : "none", 
                                  color: idx < Math.round(s.score) ? "var(--color-status-reserved)" : "var(--border)" 
                                }} 
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: progressWidth, background: scoreColor }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <Star className="h-8 w-8 mb-2" style={{ color: "var(--text-3)" }} />
              <div className="text-[13px] font-semibold">Awaiting Client Feedback</div>
              <p className="mt-1 max-w-[280px] text-[11px] px-4" style={{ color: "var(--text-3)" }}>
                This card will update automatically once the client completes the Google Form evaluation link sent after event breakdown.
              </p>
              <button 
                onClick={openClientForm}
                className="mt-4 rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Simulate Webhook Ingestion
              </button>
            </div>
          )}
        </Section>
      </div>



      {/* Simulate Client Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-[15px] font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} /> Google Forms Webhook Simulator
              </h3>
              <button onClick={() => setShowWebhookModal(false)} className="text-[12px] font-semibold hover:opacity-80" style={{ color: "var(--text-3)" }}>✕</button>
            </div>

            <div className="space-y-4 pr-1">
              <div className="rounded border p-3 bg-[var(--surface-2)] text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                This simulating modal issues a webhook trigger matching the Apps Script signature payload to: 
                <code className="block mt-1 font-mono text-[10px] bg-[var(--surface)] p-1 rounded" style={{ color: "var(--accent)" }}>
                  POST /bookings/{b.code}/client-evaluation
                </code>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Respondent Name
                <input 
                  type="text" 
                  value={respondentName} 
                  onChange={(e) => setRespondentName(e.target.value)} 
                  placeholder="e.g. John Doe (Event Organizer)"
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                  style={{ borderColor: "var(--border)" }} 
                />
              </label>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                <span className="label-eyebrow text-[9px]">Ingested Client Metrics & Dynamic Scales</span>
                {clientMetrics.map((m) => {
                  const score = clientScores[m.key] ?? (m.valueType === "boolean" ? 1 : m.valueType === "rating_5" ? 5 : m.valueType === "percentage" ? 100 : 10);
                  return (
                    <div key={m.id} className="space-y-1.5 rounded border p-2.5 bg-[var(--surface-2)] animate-in fade-in duration-200" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold">{m.label}</span>
                        <span className="font-data text-[12px] font-bold" style={{ color: "var(--accent)" }}>
                          {m.valueType === "boolean" ? (score === 1 ? "Met" : "Not Met")
                           : m.valueType === "rating_5" ? `${score} / 5`
                           : m.valueType === "percentage" ? `${score}%`
                           : `${score} / 10`}
                        </span>
                      </div>

                      {m.valueType === "boolean" && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setClientScores(prev => ({ ...prev, [m.key]: score === 1 ? 0 : 1 }))}
                            className="rounded px-3 py-1 text-[10px] font-bold uppercase transition"
                            style={{
                              background: score === 1 ? "var(--color-status-done)" : "var(--surface)",
                              color: score === 1 ? "#fff" : "var(--text-2)"
                            }}
                          >
                            {score === 1 ? "Met" : "Not Met"}
                          </button>
                        </div>
                      )}

                      {m.valueType === "rating_5" && (
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((StarIdx) => {
                            const starVal = StarIdx + 1;
                            return (
                              <button
                                key={StarIdx}
                                type="button"
                                onClick={() => setClientScores(prev => ({ ...prev, [m.key]: starVal }))}
                                className="transition hover:scale-110"
                              >
                                <Star 
                                  className="h-4.5 w-4.5" 
                                  style={{ 
                                    fill: starVal <= score ? "var(--color-status-reserved)" : "none", 
                                    color: starVal <= score ? "var(--color-status-reserved)" : "var(--border)" 
                                  }} 
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {m.valueType === "rating_10" && (
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5"
                          value={score} 
                          onChange={(e) => setClientScores(prev => ({ ...prev, [m.key]: parseFloat(e.target.value) || 0 }))}
                          className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]" 
                        />
                      )}

                      {m.valueType === "percentage" && (
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="1"
                          value={score} 
                          onChange={(e) => setClientScores(prev => ({ ...prev, [m.key]: parseInt(e.target.value) || 0 }))}
                          className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]" 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  if (!respondentName.trim()) {
                    toast.error("Please enter a respondent name!");
                    return;
                  }
                  const scoresList = Object.entries(clientScores).map(([metricKey, score]) => ({
                    metricKey,
                    score,
                  }));
                  simulateWebhook({
                    respondentName,
                    scores: scoresList,
                  });
                }}
                disabled={submittingWebhook}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Send className="h-3 w-3" />
                {submittingWebhook ? "Simulating..." : "Trigger Webhook"}
              </button>
              <button 
                onClick={() => setShowWebhookModal(false)} 
                className="rounded border px-4 py-2 text-[12px]" 
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
