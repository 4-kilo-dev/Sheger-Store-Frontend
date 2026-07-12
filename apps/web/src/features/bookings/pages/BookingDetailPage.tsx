import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";

import { useBookingDetail } from "../hooks/useBookingDetail";
import { useBookingActions } from "../hooks/useBookingActions";
import { useBookingEvaluations } from "../hooks/useBookingEvaluations";

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

  // Custom Hooks managing queries, mutations and UI states
  const detail = useBookingDetail(code);
  const { booking, isLoading, error, checkoutSnapshot, isTechnician, userRole, isUserDriver } = detail;

  const actions = useBookingActions(code, booking, userRole, isUserDriver);
  const evaluations = useBookingEvaluations(code, booking, userRole);

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
      {/* Top action row */}
      <BookingActionBar
        isTechnician={isTechnician}
        computedActions={actions.computedActions}
        setSelectedAction={actions.setSelectedAction}
        setShowActionModal={actions.setShowActionModal}
        setCancellationReason={actions.setCancellationReason}
      />

      {/* SOP Action Form Banner */}
      <BookingActionModal booking={booking} actions={actions} />

      {/* Booking Header Card */}
      <BookingHeader booking={booking} />

      {/* Technician workflow operations panel */}
      <TechnicianBanner
        booking={booking}
        isTechnician={isTechnician}
        userRole={userRole}
        actions={actions}
        openInternalForm={evaluations.openInternalForm}
      />

      {/* Tab selection navigation strip */}
      <BookingTabBar isTechnician={isTechnician} tab={tab} setTab={setTab} />

      {/* Active Tab Panel */}
      {tab === "Overview" && <OverviewTab b={booking} code={code} />}
      {tab === "Schedule" && <ScheduleTab b={booking} />}
      {tab === "Team" && <TeamTab b={booking} />}
      {tab === "Equipment" && <EquipmentTab b={booking} />}
      {tab === "Payments" && <PaymentsTab b={booking} />}
      {tab === "Files" && <FilesTab b={booking} />}
      {tab === "Activity" && <ActivityTab b={booking} />}
      {tab === "Evaluations" && <EvaluationsTab b={booking} evaluations={evaluations} />}

      {/* Page-level confirmation modals */}
      <DeclineAssignmentModal actions={actions} />
      <DamageReportModal checkoutSnapshot={checkoutSnapshot} actions={actions} />
      <InternalEvalModal booking={booking} evaluations={evaluations} />
    </AppShell>
  );
}
