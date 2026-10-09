import type { OverviewSectionDef } from "./types";
import { TechnicianAcceptedWorkspace } from "./TechnicianAcceptedWorkspace";
import { BookingSpecificationsEditor } from "./BookingSpecificationsEditor";
import { OnsiteDashboard } from "./OnsiteDashboard";
import { TechnicalHoldsSection } from "./TechnicalHoldsSection";
import { OoCrewAssignmentSection } from "./OoCrewAssignmentSection";
import { OoVehicleDriverSection } from "./OoVehicleDriverSection";
import { ClientContactSection } from "./ClientContactSection";
import { VenueSetupSection } from "./VenueSetupSection";
import { LogisticsTeamSection } from "./LogisticsTeamSection";
import { NotesRequirementsSection } from "./NotesRequirementsSection";

const TERMINAL_BOOKING_STATUSES = new Set(["COMPLETED", "PARTIALLY_RETURNED", "DONE", "CANCELED"]);

export const OVERVIEW_MAIN_SECTIONS: OverviewSectionDef[] = [
  {
    id: "tech-accepted-workspace",
    Component: TechnicianAcceptedWorkspace,
    when: (caps) => caps.showTechAcceptedWorkspace,
  },
  {
    id: "booking-specifications",
    Component: BookingSpecificationsEditor,
    when: (caps, b) => {
      // Full editable booking details — booking.edit only (not field technicians)
      if (!caps.canEditLogistics) return false;
      if (!caps.canBypassStageLock && TERMINAL_BOOKING_STATUSES.has(b.status)) return false;
      return true;
    },
  },
  {
    id: "onsite-dashboard",
    Component: OnsiteDashboard,
    when: (_caps, b) => b.status === "ONSITE",
  },
  {
    id: "technical-holds",
    Component: TechnicalHoldsSection,
    // Read-only allocations remain part of the job brief after completion.
    when: () => true,
  },
  {
    id: "oo-crew-assignment",
    Component: OoCrewAssignmentSection,
    when: (caps, b) =>
      (caps.canBypassStageLock || ["PREPARATION", "ONSITE"].includes(b.status)) &&
      caps.canAssignCrew,
  },
  {
    id: "oo-vehicle-driver",
    Component: OoVehicleDriverSection,
    when: () => true,
  },
  {
    id: "client-contact",
    Component: ClientContactSection,
    when: () => true,
  },
  {
    id: "venue-setup",
    Component: VenueSetupSection,
    // Read-only venue/spec view for users without booking.edit (e.g. technicians) or non-admins on closed bookings
    when: (caps, b) =>
      !caps.canEditLogistics ||
      (!caps.canBypassStageLock && TERMINAL_BOOKING_STATUSES.has(b.status)),
  },
  {
    id: "logistics-team",
    Component: LogisticsTeamSection,
    when: () => true,
  },
  {
    id: "notes-requirements",
    Component: NotesRequirementsSection,
    when: () => true,
  },
];

/** Sidebar is composed by OverviewSidebar; kept for symmetry / future widgets. */
export const OVERVIEW_SIDEBAR_SECTIONS: OverviewSectionDef[] = [];
