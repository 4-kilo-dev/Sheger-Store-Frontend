import type { OverviewSectionDef } from "./types";
import { TechnicianAcceptedWorkspace } from "./TechnicianAcceptedWorkspace";
import { BookingSpecificationsEditor } from "./BookingSpecificationsEditor";
import { OnsiteDashboard } from "./OnsiteDashboard";
import { TechnicalHoldsSection } from "./TechnicalHoldsSection";
import { CtoTechnicianAssignmentSection } from "./CtoTechnicianAssignmentSection";
import { OoCrewAssignmentSection } from "./OoCrewAssignmentSection";
import { OoVehicleDriverSection } from "./OoVehicleDriverSection";
import { ClientContactSection } from "./ClientContactSection";
import { VenueSetupSection } from "./VenueSetupSection";
import { LogisticsTeamSection } from "./LogisticsTeamSection";
import { NotesRequirementsSection } from "./NotesRequirementsSection";

const SPEC_EDIT_STATUSES = new Set([
  "ACCEPTED",
  "ONSITE",
  "RESERVED",
  "CONFIRMED",
  "ASSIGNED",
]);

export const OVERVIEW_MAIN_SECTIONS: OverviewSectionDef[] = [
  {
    id: "tech-accepted-workspace",
    Component: TechnicianAcceptedWorkspace,
    when: (caps) => caps.showTechAcceptedWorkspace,
  },
  {
    id: "booking-specifications",
    Component: BookingSpecificationsEditor,
    when: (caps, b) => caps.canEditBooking && SPEC_EDIT_STATUSES.has(b.status),
  },
  {
    id: "onsite-dashboard",
    Component: OnsiteDashboard,
    when: (_caps, b) => b.status === "ONSITE",
  },
  {
    id: "technical-holds",
    Component: TechnicalHoldsSection,
    when: (_caps, b) => b.status === "RESERVED",
  },
  {
    id: "cto-technician-assignment",
    Component: CtoTechnicianAssignmentSection,
    when: (caps, b) => b.status === "CONFIRMED" && caps.canAssignTechnician,
  },
  {
    id: "oo-crew-assignment",
    Component: OoCrewAssignmentSection,
    when: (caps, b) => b.status === "PREPARATION" && caps.canAssignCrew,
  },
  {
    id: "oo-vehicle-driver",
    Component: OoVehicleDriverSection,
    when: (caps, b) => b.status === "PREPARATION" && caps.canEditBooking,
  },
  {
    id: "client-contact",
    Component: ClientContactSection,
    when: () => true,
  },
  {
    id: "venue-setup",
    Component: VenueSetupSection,
    when: () => true,
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
