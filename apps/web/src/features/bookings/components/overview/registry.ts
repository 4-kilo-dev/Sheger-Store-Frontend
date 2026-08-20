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

const TERMINAL_BOOKING_STATUSES = new Set(["DONE", "CANCELED"]);

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
      if (!caps.canEditLogistics || TERMINAL_BOOKING_STATUSES.has(b.status)) return false;
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
    when: (caps, b) => {
      if (TERMINAL_BOOKING_STATUSES.has(b.status)) return false;
      // Writers can manage holds beyond RESERVED; others only see at RESERVED
      if (caps.canWriteTechnicalHolds) return true;
      return b.status === "RESERVED";
    },
  },
  {
    id: "oo-crew-assignment",
    Component: OoCrewAssignmentSection,
    when: (caps, b) => ["PREPARATION", "ONSITE"].includes(b.status) && caps.canAssignCrew,
  },
  {
    id: "oo-vehicle-driver",
    Component: OoVehicleDriverSection,
    when: (_caps, b) => !TERMINAL_BOOKING_STATUSES.has(b.status),
  },
  {
    id: "client-contact",
    Component: ClientContactSection,
    when: () => true,
  },
  {
    id: "venue-setup",
    Component: VenueSetupSection,
    // Read-only venue/spec view for users without booking.edit (e.g. technicians)
    when: (caps) => !caps.canEditLogistics,
  },
  {
    id: "logistics-team",
    Component: LogisticsTeamSection,
    when: (caps) => caps.showOpsSidebar,
  },
  {
    id: "notes-requirements",
    Component: NotesRequirementsSection,
    when: () => true,
  },
];

/** Sidebar is composed by OverviewSidebar; kept for symmetry / future widgets. */
export const OVERVIEW_SIDEBAR_SECTIONS: OverviewSectionDef[] = [];
