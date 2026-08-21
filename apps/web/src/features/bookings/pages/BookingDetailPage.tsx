import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";

import { useBookingDetail } from "../hooks/useBookingDetail";
import { useBookingActions } from "../hooks/useBookingActions";
import { useBookingEvaluations } from "../hooks/useBookingEvaluations";
import { useBookingCapabilities } from "../hooks/useBookingCapabilities";

import { BookingHeader } from "../components/BookingHeader";
import { BookingActionBar } from "../components/BookingActionBar";
import { BookingActionModal } from "../components/BookingActionModal";
import { BookingSyncStatus } from "../components/BookingSyncStatus";
import { DeclinedAssignmentBanner } from "../components/DeclinedAssignmentBanner";
import { TechnicianBanner } from "../components/TechnicianBanner";
import { BookingTabBar } from "../components/BookingTabBar";
import { DeclineAssignmentModal } from "../components/DeclineAssignmentModal";
import { DamageReportModal } from "../components/DamageReportModal";
import { InternalEvalModal } from "../components/InternalEvalModal";
import { BomFulfillmentConflictModal } from "../components/BomFulfillmentConflictModal";
import { DeleteConfirmModal } from "../components/shared/DeleteConfirmModal";

import { OverviewTab } from "../components/tabs/OverviewTab";
import { ScheduleTab } from "../components/tabs/ScheduleTab";
import { TeamTab } from "../components/tabs/TeamTab";
import { EquipmentTab } from "../components/tabs/EquipmentTab";
import { PaymentsTab } from "../components/tabs/PaymentsTab";
import { FilesTab } from "../components/tabs/FilesTab";
import { ActivityTab } from "../components/tabs/ActivityTab";
import { EvaluationsTab } from "../components/tabs/EvaluationsTab";

import { createForceDoneAction, type TabName } from "../constants";
import { getBookingPollCopy } from "@vortex/utils";

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
        <Link to="/bookings" className="text-[12px]" style={{ color: "var(--accent)" }}>
          ← Back to Bookings
        </Link>
      </div>
    </AppShell>
  ),
  component: BookingDetail,
});

export function BookingDetail() {
  const { code } = _Route.useParams();
  const [tab, setTab] = useState<TabName>("Overview");

  const detail = useBookingDetail(code);
  const { booking, isLoading, error, checkoutSnapshot, pollPhase, refetch } = detail;

  const caps = useBookingCapabilities(booking);
  const actions = useBookingActions(code, booking, {
    canFetchStaff: caps.canFetchStaff,
    onGoToEquipmentTab: () => setTab("Equipment"),
    canOverrideAvailability: caps.canOverrideAvailability,
  });
  const evaluations = useBookingEvaluations(code, booking);

  const barActions = caps.statusActions.filter((a) => {
    // Field-ops banner owns BOM advance + eval CTA when visible
    if (caps.showFieldOpsBanner && a.targetStatus === "PREPARATION") return false;
    if (caps.showFieldOpsBanner && a.permissionKey === "eval.submit_internal") return false;
    return true;
  });
  if (caps.canForceDone && booking && booking.status !== "DONE" && booking.status !== "CANCELED") {
    barActions.push(createForceDoneAction());
  }

  // Keep active tab in the visible set when capabilities change
  const safeTab = caps.visibleTabs.includes(tab) ? tab : caps.visibleTabs[0] || "Overview";

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <div className="text-[14px] font-semibold">{getBookingPollCopy("loading").title}...</div>
          <div className="text-[12px]" style={{ color: "var(--text-3)" }}>
            {getBookingPollCopy("loading").detail}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!booking) {
    const failedPhase = pollPhase === "timeout" || pollPhase === "failure" ? pollPhase : "failure";
    const copy = error
      ? getBookingPollCopy(failedPhase)
      : { title: "Booking not found", detail: "Return to bookings and choose another booking." };
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8" style={{ color: "var(--accent)" }} />
          <div className="text-[15px] font-semibold">{copy.title}</div>
          <div className="max-w-md text-[12px]" style={{ color: "var(--text-3)" }}>
            {copy.detail}
          </div>
          {error ? (
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[12px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Retry
            </button>
          ) : null}
          <Link to="/bookings" className="text-[12px]" style={{ color: "var(--accent)" }}>
            ← Back to Bookings
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BookingActionBar
        statusActions={barActions}
        setSelectedAction={actions.setSelectedAction}
        setShowActionModal={actions.setShowActionModal}
        setCancellationReason={actions.setCancellationReason}
        canDeleteBooking={caps.canDeleteBooking}
        onDeleteBooking={() => actions.triggerDeleteBooking({ id: booking.id, code: booking.code })}
      />

      <BookingActionModal booking={booking} actions={actions} />

      <BookingHeader booking={booking} />

      <BookingSyncStatus phase={pollPhase} onRetry={() => void refetch()} />

      <DeclinedAssignmentBanner booking={booking} caps={caps} actions={actions} />

      <TechnicianBanner
        booking={booking}
        caps={caps}
        actions={actions}
        openInternalForm={evaluations.openInternalForm}
      />

      <BookingTabBar
        visibleTabs={caps.visibleTabs}
        tab={safeTab}
        setTab={setTab}
      />

      {safeTab === "Overview" && <OverviewTab b={booking} code={code} caps={caps} />}
      {safeTab === "Schedule" && <ScheduleTab b={booking} />}
      {safeTab === "Team" && <TeamTab b={booking} />}
      {safeTab === "Equipment" && <EquipmentTab b={booking} caps={caps} />}
      {safeTab === "Payments" && <PaymentsTab b={booking} />}
      {safeTab === "Files" && <FilesTab b={booking} />}
      {safeTab === "Activity" && <ActivityTab b={booking} />}
      {safeTab === "Evaluations" && (
        <EvaluationsTab b={booking} evaluations={evaluations} />
      )}

      <DeclineAssignmentModal actions={actions} />
      <DamageReportModal booking={booking} checkoutSnapshot={checkoutSnapshot} actions={actions} />
      <InternalEvalModal booking={booking} evaluations={evaluations} />
      <BomFulfillmentConflictModal
        open={actions.showCheckoutConflictModal}
        lines={actions.checkoutConflicts}
        onClose={() => actions.setShowCheckoutConflictModal(false)}
        onGoToEquipment={() => actions.onGoToEquipmentTab?.()}
        canOverride={actions.canOverrideAvailability}
        isOverriding={actions.isCheckingOut}
        onOverrideCheckout={(reason) => actions.performCheckout({ override: true, reason })}
      />
      {actions.showDeleteModal && (
        <DeleteConfirmModal
          title={`Permanently Delete Booking #${actions.targetBookingToDelete?.code || booking.code}`}
          description={`Are you sure you want to permanently delete booking #${actions.targetBookingToDelete?.code || booking.code}? This action cannot be undone.`}
          isDeleting={actions.isDeletingBooking}
          onConfirm={() => {
            const idToDelete = actions.targetBookingToDelete?.id || booking.id;
            actions.deleteBooking(idToDelete);
          }}
          onCancel={() => {
            actions.setShowDeleteModal(false);
          }}
        />
      )}
    </AppShell>
  );
}
