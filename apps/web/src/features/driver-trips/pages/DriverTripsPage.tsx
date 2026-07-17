import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { getStaffApi } from "@/features/users/services/staff.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import {
  approveDriverTripApi,
  createDriverTripApi,
  listDriverTripsApi,
  updateDriverTripApi,
  type DriverTrip,
} from "../services/driver-trips.api";

const fieldCls =
  "mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] outline-none focus:border-[var(--accent)] disabled:opacity-60";

function toIsoFromLocal(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function approvalLabel(isApproved: boolean | null) {
  if (isApproved === true) return { text: "Approved", color: "#30A46C" };
  if (isApproved === false) return { text: "Rejected", color: "#E54666" };
  return { text: "Pending", color: "#E8A030" };
}

function durationLabel(trip: DriverTrip) {
  if (!trip.arrivedAt) return "—";
  const mins = Math.round(
    (new Date(trip.arrivedAt).getTime() - new Date(trip.leftAt).getTime()) / 60_000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function DriverTripsPage() {
  const queryClient = useQueryClient();
  const { formatDateTime } = useDateFormatter();
  const { can } = usePermissions();

  const canView = can(PERMISSION.DRIVER_TRIP_VIEW);
  const canCreate = can(PERMISSION.DRIVER_TRIP_CREATE);
  const canEdit = can(PERMISSION.DRIVER_TRIP_EDIT);
  const canApprove = can(PERMISSION.DRIVER_TRIP_APPROVE);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");

  const [driverUserId, setDriverUserId] = useState("");
  const [leftAt, setLeftAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [reason, setReason] = useState("");
  const [plate, setPlate] = useState("");

  const [arriveDrafts, setArriveDrafts] = useState<Record<string, string>>({});

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: getStaffApi,
    enabled: canView || canCreate,
  });

  const listFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      driverUserId: filterDriverId || undefined,
    }),
    [from, to, filterDriverId],
  );

  const {
    data: trips = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["driver-trips", listFilters],
    queryFn: () => listDriverTripsApi(listFilters),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: createDriverTripApi,
    onSuccess: () => {
      toast.success("Trip logged");
      setReason("");
      setPlate("");
      setArrivedAt("");
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create trip"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, arrivedAt }: { id: string; arrivedAt: string }) =>
      updateDriverTripApi(id, { arrivedAt }),
    onSuccess: () => {
      toast.success("Arrive time saved");
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update trip"),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      approveDriverTripApi(id, isApproved),
    onSuccess: (_data, vars) => {
      toast.success(vars.isApproved ? "Trip approved" : "Trip rejected");
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
    },
    onError: (e: Error) => toast.error(e.message || "Approval failed"),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const leftIso = toIsoFromLocal(leftAt);
    if (!driverUserId || !leftIso || !reason.trim()) {
      toast.error("Driver, leave time, and reason are required");
      return;
    }
    const arrivedIso = toIsoFromLocal(arrivedAt);
    if (arrivedIso && new Date(arrivedIso) < new Date(leftIso)) {
      toast.error("Arrive time must be on or after leave time");
      return;
    }
    createMutation.mutate({
      driverUserId,
      leftAt: leftIso,
      reason: reason.trim(),
      arrivedAt: arrivedIso,
      plate: plate.trim() || undefined,
    });
  };

  if (!canView) {
    return (
      <AppShell>
        <div className="rounded-lg border p-8 text-center text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
          You do not have permission to view driver trips.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Operations</div>
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5" style={{ color: "var(--accent)" }} />
            Driver Trips
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Log leave / arrive times, reason, and approval.
          </p>
        </div>
        {(isLoading || isFetching) && (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-3)" }} />
        )}
      </div>

      {canCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-5 rounded-lg border p-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="text-[12px] font-bold">New trip</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Driver
              <select
                required
                value={driverUserId}
                onChange={(e) => setDriverUserId(e.target.value)}
                className={fieldCls}
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">— Select —</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Leave
              <div className="mt-1">
                <DatePicker value={leftAt} onChange={setLeftAt} showTime placeholder="Leave time" />
              </div>
            </label>
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Arrive (optional)
              <div className="mt-1">
                <DatePicker value={arrivedAt} onChange={setArrivedAt} showTime placeholder="Arrive time" />
              </div>
            </label>
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Plate (optional)
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. AA 3-A12345"
                className={`${fieldCls} font-mono`}
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="text-[11px] font-semibold block sm:col-span-2 lg:col-span-3" style={{ color: "var(--text-2)" }}>
              Reason
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why the car was taken"
                className={fieldCls}
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <div className="flex items-end">
              <Button
                type="submit"
                size="sm"
                className="h-9 w-full text-[12px] font-bold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving…" : "Save trip"}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
          From
          <div className="mt-1">
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          </div>
        </label>
        <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
          To
          <div className="mt-1">
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </div>
        </label>
        <label className="text-[11px] font-semibold block min-w-[180px]" style={{ color: "var(--text-2)" }}>
          Driver
          <select
            value={filterDriverId}
            onChange={(e) => setFilterDriverId(e.target.value)}
            className={fieldCls}
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">All drivers</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {(from || to || filterDriverId) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-[11px]"
            onClick={() => {
              setFrom("");
              setTo("");
              setFilterDriverId("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <th className="px-3 py-2 label-eyebrow">Driver</th>
                <th className="px-3 py-2 label-eyebrow">Leave</th>
                <th className="px-3 py-2 label-eyebrow">Arrive</th>
                <th className="px-3 py-2 label-eyebrow">Duration</th>
                <th className="px-3 py-2 label-eyebrow">Reason</th>
                <th className="px-3 py-2 label-eyebrow">Plate</th>
                <th className="px-3 py-2 label-eyebrow">Status</th>
                <th className="px-3 py-2 label-eyebrow text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center" style={{ color: "var(--text-3)" }}>
                    Loading…
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center" style={{ color: "var(--text-3)" }}>
                    No trips in this range.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const status = approvalLabel(trip.isApproved);
                  const draft = arriveDrafts[trip.id] ?? "";
                  return (
                    <tr key={trip.id} className="border-b last:border-0 align-top" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                        {trip.driver?.name || "—"}
                        {trip.booking?.bookingCode && (
                          <div className="text-[10px] font-mono font-normal mt-0.5" style={{ color: "var(--text-3)" }}>
                            {trip.booking.bookingCode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
                        {formatDateTime(trip.leftAt)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {trip.arrivedAt ? (
                          <span className="font-mono text-[11px]">
                            {formatDateTime(trip.arrivedAt)}
                          </span>
                        ) : canEdit ? (
                          <div className="flex flex-col gap-1 min-w-[160px]">
                            <DatePicker
                              value={draft}
                              onChange={(v) =>
                                setArriveDrafts((prev) => ({ ...prev, [trip.id]: v }))
                              }
                              showTime
                              placeholder="Set arrive"
                            />
                            <button
                              type="button"
                              className="text-[10px] font-bold text-left hover:underline disabled:opacity-50"
                              style={{ color: "var(--accent)" }}
                              disabled={!draft || updateMutation.isPending}
                              onClick={() => {
                                const iso = toIsoFromLocal(draft);
                                if (!iso) {
                                  toast.error("Invalid arrive time");
                                  return;
                                }
                                updateMutation.mutate(
                                  { id: trip.id, arrivedAt: iso },
                                  {
                                    onSuccess: () =>
                                      setArriveDrafts((prev) => {
                                        const next = { ...prev };
                                        delete next[trip.id];
                                        return next;
                                      }),
                                  },
                                );
                              }}
                            >
                              Save arrive
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">{durationLabel(trip)}</td>
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <span className="line-clamp-2">{trip.reason}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">
                        {trip.plate || "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold" style={{ color: status.color }}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {canApprove && trip.isApproved === null ? (
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-[10px] font-bold hover:brightness-110 disabled:opacity-50"
                              style={{ background: "rgba(48,164,108,0.15)", color: "#30A46C" }}
                              disabled={approveMutation.isPending}
                              onClick={() =>
                                approveMutation.mutate({ id: trip.id, isApproved: true })
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-[10px] font-bold hover:brightness-110 disabled:opacity-50"
                              style={{ background: "rgba(229,70,102,0.15)", color: "#E54666" }}
                              disabled={approveMutation.isPending}
                              onClick={() =>
                                approveMutation.mutate({ id: trip.id, isApproved: false })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
