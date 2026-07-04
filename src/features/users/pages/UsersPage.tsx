import { createFileRoute } from "@tanstack/react-router";
import { Search, UserCheck, Users, Radio, BriefcaseBusiness, Phone, Calendar, ChevronDown, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { STAFF_ROLES } from "@/features/checkout/services/operations.api";
import { AddStaffModal } from "../components/AddStaffModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStaffApi, resetPasswordApi, toggleUserActiveApi } from "@/features/users/services/staff.api";
import { useActiveProfile } from "@/hooks/use-active-profile";
import { toast } from "sonner";

const _Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff · Vortex Visual" },
      { name: "description", content: "Manage Vortex Visual staff, roles, teams, and availability." },
    ],
  }),
  component: StaffPage,
});

const statusColor: Record<string, string> = {
  ACTIVE: "var(--color-bom-returned)",
  ONSITE: "var(--color-status-accepted)",
  "OFF DUTY": "var(--text-3)",
  "ON LEAVE": "var(--color-pay-advance)",
};

export function StaffPage() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof STAFF_ROLES)[number]>("All");
  const [activeProfile] = useActiveProfile();
  const isAdmin = activeProfile.role === "Admin";
  const queryClient = useQueryClient();

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: getStaffApi,
  });

  const { mutate: resetPassword } = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: (res, userId) => {
      const userObj = staffList.find((s) => s.id === userId);
      toast.success(
        `Password reset for ${userObj?.name || "staff"}! Temporary password: ${res.temporaryPassword}`,
        { duration: 15000, description: "Copy and share securely. User must update it on first login." }
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      toggleUserActiveApi(userId, active),
    onSuccess: (_, variables) => {
      toast.success(variables.active ? "Account activated successfully" : "Account deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle account status");
    },
  });

  const handleResetPassword = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to reset the password for ${name}?`)) {
      resetPassword(userId);
    }
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    const action = currentActive ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${action} this staff member's account?`)) {
      toggleActive({ userId, active: !currentActive });
    }
  };

  const rows = useMemo(
    () =>
      staffList.filter(
        (person) =>
          (roleFilter === "All" || person.role === roleFilter) &&
          `${person.name} ${person.role} ${person.team}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, roleFilter, staffList],
  );

  const counts = useMemo(() => ({
    total: staffList.length,
    active: staffList.filter((s) => s.status === "ACTIVE").length,
    onsite: staffList.filter((s) => s.status === "ONSITE").length,
    openAssignments: 7,
  }), [staffList]);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">People Operations</div>
          <h1 className="text-[24px] font-bold tracking-tight">Staff Management</h1>
          <p className="mt-1 text-[12px] text-text-2">Roles, duty status, workload, and crew contact directory.</p>
        </div>
        <AddStaffModal />
      </div>

      {/* Stats */}
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Staff", value: String(counts.total), note: `Across ${STAFF_ROLES.length - 1} operational roles`, icon: Users },
          { label: "Available Now", value: String(counts.active), note: "Ready for assignment", icon: UserCheck },
          { label: "Currently Onsite", value: String(counts.onsite), note: "Across active jobs", icon: Radio },
          { label: "Open Assignments", value: String(counts.openAssignments), note: "Need crew allocation", icon: BriefcaseBusiness },
        ].map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <span className="label-eyebrow">{label}</span>
              <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <div className="mt-3 text-[22px] font-bold">{value}</div>
            <div className="mt-1 text-[11px] text-text-2">{note}</div>
          </div>
        ))}
      </div>

      {/* Role filter tabs */}
      <div className="mb-3 flex items-center gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {STAFF_ROLES.map((role) => {
          const active = roleFilter === role;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className="relative px-3 py-2.5 text-[12px] font-semibold transition"
              style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
            >
              {role}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff, role or team…"
            className="h-9 w-full rounded-md border bg-[var(--surface-2)] pl-9 pr-3 text-xs outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--text-2)" }}>{rows.length} staff visible</span>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const workloadPct = Math.round((p.jobs / p.capacity) * 100);
          return (
            <div key={p.name} className="group rounded-lg border p-4 transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                    {p.initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold">{p.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{p.role}</div>
                  </div>
                </div>
                <span
                  className="rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", color: statusColor[p.status] || "var(--text-2)" }}
                >
                  {p.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
                  <Users className="h-3 w-3" /> {p.team}
                </div>
                <div className="flex items-center gap-1.5 font-mono" style={{ color: "var(--text-2)" }}>
                  <Phone className="h-3 w-3" /> {p.phone.slice(-9)}
                </div>
              </div>

              {/* Workload bar */}
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>Workload</span>
                  <span className="font-mono font-semibold" style={{ color: workloadPct > 80 ? "var(--destructive)" : "var(--accent)" }}>{p.jobs}/{p.capacity} jobs ({workloadPct}%)</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(workloadPct, 100)}%`,
                      background: workloadPct > 80 ? "var(--destructive)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>

               {isAdmin && p.id && (
                <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => handleResetPassword(p.id!, p.name)}
                    className="rounded bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold transition hover:bg-border cursor-pointer"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleToggleActive(p.id!, p.status !== "OFF DUTY")}
                    className="rounded px-2.5 py-1 text-[10px] font-semibold transition cursor-pointer"
                    style={{
                      background: p.status !== "OFF DUTY" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                      color: p.status !== "OFF DUTY" ? "#f87171" : "#4ade80",
                      border: p.status !== "OFF DUTY" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    {p.status !== "OFF DUTY" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t pt-3 text-[10px]" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-3)" }}>
                  <Calendar className="mr-1 inline h-3 w-3" />
                  Joined {p.joinedDate}
                </span>
                <button className="font-semibold cursor-pointer" style={{ color: "var(--accent)" }}>Assign to Booking →</button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}