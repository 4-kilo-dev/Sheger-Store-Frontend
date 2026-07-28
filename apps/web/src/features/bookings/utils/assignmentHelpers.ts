/** Whether an assignment row represents a technician decline. */
export function isDeclinedAssignment(a: any): boolean {
  if (!a) return false;
  const status = (a.status || a.responseStatus || "").toString().toUpperCase();
  if (status === "DECLINED") return true;
  return !!(a.declineReason && a.respondedAt);
}

export function isTechnicianAssignment(a: any): boolean {
  const role = (a?.roleContext || "").toString().toUpperCase();
  return role === "TECHNICIAN";
}

export function getDeclinedTechnicianAssignments(assignments: any[] | undefined): any[] {
  return (assignments || []).filter(
    (a) => isTechnicianAssignment(a) && isDeclinedAssignment(a)
  );
}

export function getActiveTechnicianAssignments(assignments: any[] | undefined): any[] {
  return (assignments || []).filter(
    (a) => isTechnicianAssignment(a) && !isDeclinedAssignment(a)
  );
}

/** Whether the user has an active TECHNICIAN assignment on the booking. */
export function isAssignedTechnicianOnBooking(
  assignments: any[] | undefined,
  userId: string | undefined
): boolean {
  if (!assignments?.length || !userId) return false;
  return assignments.some(
    (a) => a.userId === userId && isTechnicianAssignment(a) && !isDeclinedAssignment(a)
  );
}
