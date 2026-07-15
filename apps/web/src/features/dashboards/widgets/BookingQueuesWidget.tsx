import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, DollarSign, CalendarCheck, Wrench, Users, ClipboardCheck, Package, PackageCheck, Truck, RadioTower } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";
import { QueueSection } from "../components/QueueSection";
import { BookingQueueItem } from "../components/BookingQueueItem";

export function BookingQueuesWidget() {
  const authUser = useAuthUser();
  const role = authUser?.role?.toLowerCase() || "";

  const { data: bookingsList = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  // Filters for CCR
  const ccrReserved = useMemo(() => bookingsList.filter((b) => b.status === "RESERVED"), [bookingsList]);
  const ccrUnpaid = useMemo(() => bookingsList.filter((b) => b.payment === "UNPAID" || b.payment === "ADVANCE"), [bookingsList]);

  // Filters for CTO
  const ctoConfirmed = useMemo(() => bookingsList.filter((b) => b.status === "CONFIRMED"), [bookingsList]);
  const ctoAssigned = useMemo(() => bookingsList.filter((b) => b.status === "ASSIGNED"), [bookingsList]);
  // Reserved but not yet paid — awaiting CCR payment before they can progress.
  const ctoWaitingReview = useMemo(
    () => bookingsList.filter((b) => b.status === "RESERVED" && b.payment === "UNPAID"),
    [bookingsList]
  );
  // Reserved with advance/full payment — ready to be picked up for technician assignment.
  const ctoReadyForAssignment = useMemo(
    () => bookingsList.filter((b) => b.status === "RESERVED" && (b.payment === "ADVANCE" || b.payment === "PAID")),
    [bookingsList]
  );

  // Filters for Technician / Freelancer / Stagehand
  const techAssigned = useMemo(() => {
    // If it's a specific technician, filter to their assignments (or show all in V1)
    const isSupervisorOrAdmin = ["admin", "supervisor"].includes(role);
    return bookingsList.filter((b) => {
      if (b.status !== "ASSIGNED") return false;
      if (isSupervisorOrAdmin) return true;
      // Check if logged-in user name/id matches assignee or driverUserId
      return b.driverUserId === authUser?.id || b.assignees.some((name) => name === authUser?.name);
    });
  }, [bookingsList, role, authUser]);

  const techPrep = useMemo(() => bookingsList.filter((b) => b.status === "ACCEPTED" || b.status === "PREPARATION"), [bookingsList]);

  // Filters for Storekeeper
  const skCheckouts = useMemo(() => bookingsList.filter((b) => b.status === "PREPARATION"), [bookingsList]);
  const skCheckins = useMemo(() => bookingsList.filter((b) => b.status === "COMPLETED"), [bookingsList]);

  // Filters for Ops Officer (OO)
  const ooDispatch = useMemo(() => bookingsList.filter((b) => b.status === "PREPARATION"), [bookingsList]);
  const ooOnsite = useMemo(() => bookingsList.filter((b) => b.status === "ONSITE"), [bookingsList]);
  const ooCheckinPending = useMemo(() => bookingsList.filter((b) => b.status === "COMPLETED"), [bookingsList]);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex flex-col justify-center items-center h-48 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading queues...</div>
      </div>
    );
  }

  // 1. CCR Layout
  if (role === "ccr") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <QueueSection title="Reservations waiting for confirmation" icon={Phone} count={ccrReserved.length}>
          {ccrReserved.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ccrReserved.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">All caught up — no reservations waiting</div>
          )}
        </QueueSection>
        <QueueSection title="Outstanding payments" icon={DollarSign} count={ccrUnpaid.length}>
          {ccrUnpaid.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ccrUnpaid.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No outstanding payments</div>
          )}
        </QueueSection>
      </div>
    );
  }

  // 2. CTO Layout
  if (role === "chief_tech") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <QueueSection title="Waiting for tech review" icon={ClipboardCheck} count={ctoWaitingReview.length}>
          {ctoWaitingReview.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ctoWaitingReview.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No reserved bookings awaiting payment</div>
          )}
        </QueueSection>
        <QueueSection title="Bookings ready for technician assignment" icon={DollarSign} count={ctoReadyForAssignment.length}>
          {ctoReadyForAssignment.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ctoReadyForAssignment.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No paid reservations ready yet</div>
          )}
        </QueueSection>
        <QueueSection title="Bookings ready for tech review" icon={Wrench} count={ctoConfirmed.length}>
          {ctoConfirmed.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ctoConfirmed.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">All caught up — nothing in review</div>
          )}
        </QueueSection>
        <QueueSection title="Crew assignments pending acceptance" icon={Users} count={ctoAssigned.length}>
          {ctoAssigned.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ctoAssigned.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No crew assignments pending</div>
          )}
        </QueueSection>
      </div>
    );
  }

  // 3. Storekeeper Layout
  if (role === "storekeeper") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <QueueSection title="Gear ready for check-out" icon={Truck} count={skCheckouts.length}>
          {skCheckouts.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {skCheckouts.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">All caught up — no check-outs today</div>
          )}
        </QueueSection>
        <QueueSection title="Gear pending check-in" icon={PackageCheck} count={skCheckins.length}>
          {skCheckins.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {skCheckins.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No check-ins pending</div>
          )}
        </QueueSection>
      </div>
    );
  }

  // 4. Operations Officer Layout
  if (role === "oo" || role === "ops_officer") {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        <QueueSection title="Ready to dispatch" icon={Truck} count={ooDispatch.length}>
          {ooDispatch.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ooDispatch.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">All clear — no dispatches pending</div>
          )}
        </QueueSection>
        <QueueSection title="Active onsite" icon={RadioTower} count={ooOnsite.length}>
          {ooOnsite.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ooOnsite.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No screens onsite currently</div>
          )}
        </QueueSection>
        <QueueSection title="Pending check-in" icon={PackageCheck} count={ooCheckinPending.length}>
          {ooCheckinPending.map((b) => (
            <BookingQueueItem key={b.code} booking={b} />
          ))}
          {ooCheckinPending.length === 0 && (
            <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No collections pending</div>
          )}
        </QueueSection>
      </div>
    );
  }

  // 5. Default Technician / Stagehand / Freelancer Layout
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <QueueSection title="Assignments waiting for you" icon={ClipboardCheck} count={techAssigned.length}>
        {techAssigned.map((b) => (
          <BookingQueueItem key={b.code} booking={b} />
        ))}
        {techAssigned.length === 0 && (
          <div className="py-6 text-center text-[11px] text-[var(--text-3)]">All caught up — no new assignments</div>
        )}
      </QueueSection>
      <QueueSection title="Active setups in prep" icon={Package} count={techPrep.length}>
        {techPrep.map((b) => (
          <BookingQueueItem key={b.code} booking={b} />
        ))}
        {techPrep.length === 0 && (
          <div className="py-6 text-center text-[11px] text-[var(--text-3)]">No active preparations</div>
        )}
      </QueueSection>
    </div>
  );
}
export default BookingQueuesWidget;
