import { createFileRoute } from "@tanstack/react-router";
import { Search, UserCheck, Users, Radio, BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, StatStrip } from "@/components/operations-ui";
import { STAFF } from "@/lib/mock-operations";

export const Route = createFileRoute("/staff")({ head: () => ({ meta: [{ title: "Staff · Vortex Visual" }, { name: "description", content: "Manage Vortex Visual staff, roles, teams, and availability." }] }), component: StaffPage });

function StaffPage() {
  const [query, setQuery] = useState("");
  const rows = STAFF.filter((person) => `${person.name} ${person.role} ${person.team}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell><PageHeader eyebrow="People Operations" title="Staff Management" description="Roles, duty status, workload, and crew contact directory." action="Add Staff Member" />
    <StatStrip items={[{ label: "Total Staff", value: "38", note: "Across 8 operational roles", icon: Users }, { label: "Available Now", value: "24", note: "Ready for assignment", icon: UserCheck }, { label: "Currently Onsite", value: "9", note: "Across 4 active jobs", icon: Radio }, { label: "Open Assignments", value: "7", note: "Need crew allocation", icon: BriefcaseBusiness }]} />
    <div className="mt-5 border border-border bg-surface"><div className="flex items-center gap-3 border-b border-border p-3"><div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff, role or team…" className="h-9 w-full border border-border bg-surface-2 pl-9 pr-3 text-xs outline-none focus:border-accent"/></div><span className="text-xs text-text-2">{rows.length} visible staff</span></div>
      <table className="w-full text-left text-xs"><thead className="bg-surface-2 label-eyebrow"><tr><th className="p-3">Staff member</th><th>Role</th><th>Team</th><th>Contact</th><th>Jobs</th><th>Status</th></tr></thead><tbody>{rows.map((p) => <tr key={p.name} className="border-t border-border"><td className="p-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">{p.name.split(" ").map((n) => n[0]).join("")}</div><span className="font-semibold">{p.name}</span></div></td><td>{p.role}</td><td className="text-text-2">{p.team}</td><td className="font-mono text-text-2">{p.phone}</td><td>{p.jobs}</td><td><span className="border border-border px-2 py-1 text-[10px] font-bold text-accent">{p.status}</span></td></tr>)}</tbody></table>
    </div></AppShell>;
}