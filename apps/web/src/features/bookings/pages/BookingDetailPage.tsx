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
import { TechnicianBanner } from "../components/TechnicianBanner";
import { BookingTabBar } from "../components/BookingTabBar";
import { DeclineAssignmentModal } from "../components/DeclineAssignmentModal";
import { DamageReportModal } from "../components/DamageReportModal";
import { InternalEvalModal } from "../components/InternalEvalModal";

import { OverviewTab } from "../components/tabs/OverviewTab";
import { ScheduleTab } from "../components/tabs/ScheduleTab";
import { TeamTab } from "../components/tabs/TeamTab";
import { EquipmentTab } from "../components/tabs/EquipmentTab";
import { PaymentsTab } from "../components/tabs/PaymentsTab";
import { FilesTab } from "../components/tabs/FilesTab";
import { ActivityTab } from "../components/tabs/ActivityTab";
import { EvaluationsTab } from "../components/tabs/EvaluationsTab";

import type { TabName } from "../constants";

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
  const { booking, isLoading, error, checkoutSnapshot } = detail;

  const caps = useBookingCapabilities(booking);
  const actions = useBookingActions(code, booking, { canFetchStaff: caps.canFetchStaff });
  const evaluations = useBookingEvaluations(code, booking);

  const barActions = caps.statusActions.filter((a) => {
    // Field-ops banner owns BOM advance + eval CTA when visible
    if (caps.showFieldOpsBanner && a.targetStatus === "PREPARATION") return false;
    if (caps.showFieldOpsBanner && a.permissionKey === "eval.submit_internal") return false;
    return true;
  });

  // Keep active tab in the visible set when capabilities change
  const safeTab = caps.visibleTabs.includes(tab) ? tab : caps.visibleTabs[0] || "Overview";

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
        canEditBooking={caps.canEditBooking}
        statusActions={barActions}
        setSelectedAction={actions.setSelectedAction}
        setShowActionModal={actions.setShowActionModal}
        setCancellationReason={actions.setCancellationReason}
      />

      <BookingActionModal booking={booking} actions={actions} />

      <BookingHeader booking={booking} />

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
      <DamageReportModal checkoutSnapshot={checkoutSnapshot} actions={actions} />
      <InternalEvalModal booking={booking} evaluations={evaluations} />
    </AppShell>
  );
}
