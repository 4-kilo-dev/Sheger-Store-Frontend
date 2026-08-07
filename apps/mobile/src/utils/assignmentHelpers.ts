type AssignmentLike = {
  status?: string;
  responseStatus?: string;
  declineReason?: string | null;
  respondedAt?: string | null;
  roleContext?: string;
  userId?: string;
};

/** Whether an assignment row represents a technician decline. */
export function isDeclinedAssignment(a: AssignmentLike | null | undefined): boolean {
  if (!a) return false;
  const status = (a.status || a.responseStatus || "").toString().toUpperCase();
  if (status === "DECLINED") return true;
  return !!(a.declineReason && a.respondedAt);
}

export function isTechnicianAssignment(a: AssignmentLike | null | undefined): boolean {
  const role = (a?.roleContext || "").toString().toUpperCase();
  return role === "TECHNICIAN";
}

export function getDeclinedTechnicianAssignments<T extends AssignmentLike>(
  assignments: T[] | undefined,
): T[] {
  return (assignments || []).filter(
    (a) => isTechnicianAssignment(a) && isDeclinedAssignment(a),
  );
}

export function getActiveTechnicianAssignments<T extends AssignmentLike>(
  assignments: T[] | undefined,
): T[] {
  return (assignments || []).filter(
    (a) => isTechnicianAssignment(a) && !isDeclinedAssignment(a),
  );
}

/** Whether the user has an active TECHNICIAN assignment on the booking. */
export function isAssignedTechnicianOnBooking(
  assignments: AssignmentLike[] | undefined,
  userId: string | undefined,
): boolean {
  if (!assignments?.length || !userId) return false;
  return assignments.some(
    (a) => a.userId === userId && isTechnicianAssignment(a) && !isDeclinedAssignment(a),
  );
}
