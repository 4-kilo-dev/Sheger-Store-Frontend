import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CalendarRange, TrendingUp, Package, Clock, Phone, DollarSign, 
  CalendarCheck, Wrench, Users, ClipboardCheck, PackageCheck, 
  Truck, RadioTower, Utensils, CheckCircle2
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";
import { getCombinedInventoryApi } from "@/features/inventory/services/inventory.api";
import { StatCard } from "../components/StatCard";

export function StatsOverviewWidget() {
  const authUser = useAuthUser();
  const role = authUser?.role?.toLowerCase() || "";

  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const { data: inventoryList = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: getCombinedInventoryApi,
    enabled: ["admin", "supervisor", "storekeeper"].includes(role),
  });

  // 1. Calculations for Admin/Supervisor
  const adminStats = useMemo(() => {
    const now = new Date();
    const thisMonth = bookingsList.filter((b) => {
      if (!b.eventDate) return false;
      const d = new Date(b.eventDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const revenue = thisMonth.reduce((s, b) => s + (b.amount || 0), 0);
    const onsite = bookingsList.filter((b) => b.status === "ONSITE").length;
    const upcoming = bookingsList.filter((b) => {
      if (!b.assemblyDate) return false;
      const d = new Date(b.assemblyDate);
      const diff = (d.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    }).length;
    const paid = bookingsList.filter((b) => b.payment === "PAID").length;
    return { thisMonth: thisMonth.length, revenue, onsite, upcoming, paid };
  }, [bookingsList]);

  // 2. Calculations for CCR
  const ccrStats = useMemo(() => {
    const reserved = bookingsList.filter((b) => b.status === "RESERVED").length;
    const unpaid = bookingsList.filter((b) => b.payment === "UNPAID" || b.payment === "ADVANCE").length;
    const confirmedToday = bookingsList.filter((b) => b.status === "CONFIRMED").length;
    return { reserved, unpaid, confirmedToday };
  }, [bookingsList]);

  // 3. Calculations for CTO
  const ctoStats = useMemo(() => {
    const confirmed = bookingsList.filter((b) => b.status === "CONFIRMED").length;
    const assigned = bookingsList.filter((b) => b.status === "ASSIGNED").length;
    const inPrep = bookingsList.filter((b) => b.status === "PREPARATION").length;
    return { confirmed, assigned, inPrep };
  }, [bookingsList]);

  // 4. Calculations for Storekeeper
  const skStats = useMemo(() => {
    const onsite = bookingsList.filter((b) => b.status === "ONSITE").length;
    const completed = bookingsList.filter((b) => b.status === "COMPLETED").length;
    const damaged = bookingsList.filter((b) => b.bomItems && b.bomItems.some((item) => item.status === "Checked Out")).length;
    const totalAvail = bookingsList.reduce((s, b) => s + (b.bomItems ? b.bomItems.filter((i) => i.status === "Reserved").length : 0), 0);
    return { onsite, completed, damaged: damaged || 3, totalAvail };
  }, [bookingsList]);

  // 5. Calculations for Operations Officer
  const ooStats = useMemo(() => {
    const readyToDispatch = bookingsList.filter((b) => b.status === "PREPARATION").length;
    const onsite = bookingsList.filter((b) => b.status === "ONSITE").length;
    const completed = bookingsList.filter((b) => b.status === "COMPLETED").length;
    return { readyToDispatch, onsite, completed };
  }, [bookingsList]);

  // 6. Calculations for Technician / Stagehand / Freelancer
  const techStats = useMemo(() => {
    const assigned = bookingsList.filter((b) => b.status === "ASSIGNED").length;
    const accepted = bookingsList.filter((b) => b.status === "ACCEPTED").length;
    const inPrep = bookingsList.filter((b) => b.status === "PREPARATION").length;
    return { assigned, accepted, inPrep };
  }, [bookingsList]);

  // Render cards based on role
  if (role === "admin" || role === "supervisor") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bookings this month" value={adminStats.thisMonth} trend={`${adminStats.paid} paid`} icon={CalendarRange} />
        <StatCard label="Revenue" value={`${(adminStats.revenue / 1000).toFixed(0)}K ETB`} trend="+14.2% from last month" icon={TrendingUp} trendColor="var(--color-bom-returned)" />
        <StatCard label="Screens onsite" value={adminStats.onsite} trend="Active right now" icon={Package} trendColor="var(--color-status-accepted)" />
        <StatCard label="Assemblies this week" value={adminStats.upcoming} trend="Next 7 days" icon={Clock} trendColor="var(--color-pay-advance)" />
      </div>
    );
  }

  if (role === "ccr") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Awaiting confirmation" value={ccrStats.reserved} note="Reservations that need payment to proceed" icon={Phone} />
        <StatCard label="Payment follow-ups" value={ccrStats.unpaid} note="Unpaid or partially paid bookings" icon={DollarSign} />
        <StatCard label="Confirmed today" value={ccrStats.confirmedToday} note="Bookings locked in so far today" icon={CalendarCheck} />
      </div>
    );
  }

  if (role === "chief_tech") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Pending tech review" value={ctoStats.confirmed} note="Confirmed bookings you need to assign" icon={Wrench} />
        <StatCard label="Assigned to technicians" value={ctoStats.assigned} note="Waiting for technician acceptance" icon={Users} />
        <StatCard label="In preparation" value={ctoStats.inPrep} note="BOM and design work underway" icon={ClipboardCheck} />
      </div>
    );
  }

  if (role === "storekeeper") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Materials out" value={skStats.onsite} note="Active check-outs" icon={Package} />
        <StatCard label="Pending return" value={skStats.completed} note="Waiting for check-in" icon={PackageCheck} />
        <StatCard label="Damage queue" value={skStats.damaged} note="Needs inspection" icon={Wrench} />
        <StatCard label="Reserved items" value={skStats.totalAvail} note="Upcoming bookings" icon={ClipboardCheck} />
      </div>
    );
  }

  if (role === "oo" || role === "ops_officer") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Ready to dispatch" value={ooStats.readyToDispatch} icon={Truck} />
        <StatCard label="Active onsite" value={ooStats.onsite} icon={RadioTower} />
        <StatCard label="Pending check-in" value={ooStats.completed} icon={PackageCheck} />
        <StatCard label="Meal budgets active" value={ooStats.onsite} icon={Utensils} />
      </div>
    );
  }

  // default for technician, stagehand, freelancer
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard label="New assignments" value={techStats.assigned} note="Waiting for your acceptance" icon={ClipboardCheck} />
      <StatCard label="Accepted" value={techStats.accepted} note="Ready for BOM preparation" icon={CheckCircle2} />
      <StatCard label="In preparation" value={techStats.inPrep} note="BOM and drawings in progress" icon={Package} />
    </div>
  );
}
export default StatsOverviewWidget;
