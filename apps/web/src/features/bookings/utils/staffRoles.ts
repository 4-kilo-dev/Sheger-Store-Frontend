/** Field technicians and chief technicians assignable under TECHNICIAN context. */
export function isAssignableTechnician(role: string): boolean {
  const r = role.toLowerCase();
  return (
    r === "technician" ||
    r === "to" ||
    r.includes("chief") ||
    r === "cto" ||
    r === "chief technician" ||
    r === "chief tech"
  );
}

export function isChiefTechnicianRole(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes("chief") || r === "cto" || r === "chief tech";
}
