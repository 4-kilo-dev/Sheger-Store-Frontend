const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isNonDeclinedAssignment(a: any): boolean {
  if (!a) return false;
  const status = (a.status || a.responseStatus || "").toString().toUpperCase();
  if (status === "DECLINED") return false;
  if (a.declineReason && a.respondedAt) return false;
  return true;
}

/** Pick a real assignment UUID for internal eval, or undefined to omit. */
export function pickEvalAssignmentId(assignments: any[] | undefined): string | undefined {
  if (!assignments?.length) return undefined;

  const active = assignments.filter(isNonDeclinedAssignment);
  const preferred =
    active.find((a) => a.isTeamLead) ||
    active.find((a) => {
      const role = (a.roleContext || "").toString().toUpperCase();
      return role === "TECHNICIAN" || role === "CREW";
    }) ||
    active[0];

  return isValidUuid(preferred?.id) ? preferred.id : undefined;
}
