import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Banknote, CalendarCheck, Download, Gauge, TrendingUp, BarChart3, 
  Users, Filter, AlertTriangle, Check, ShieldAlert, AlertCircle, RefreshCw
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { 
  getBookingsReportApi, 
  getInventoryReportApi, 
  getRevenueReportApi, 
  getCustomersReportApi, 
  getEvaluationsReportApi, 
  getCanceledBookingsReportApi, 
  getUpcomingBookingsReportApi,
  type BookingReportRecord,
  type InventoryReportRecord,
  type RevenuePaymentRecord,
  type CustomerReportRecord,
  type EvaluationReportRecord,
  type CanceledBookingReportRecord,
  type UpcomingBookingReportRecord
} from "../services/reports.api";

const _Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Business Intelligence · Vortex Visual" },
      { name: "description", content: "Booking, revenue, equipment, and crew performance reports." },
    ],
  }),
  component: ReportsPage,
});

const TABS = [
  { id: "revenue_bookings", label: "Revenue & Bookings" },
  { id: "inventory_health", label: "Inventory Health" },
  { id: "client_directory", label: "Client Directory" },
  { id: "quality_crew", label: "Quality & Crew" },
  { id: "audit_logs", label: "Audit Logs" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("revenue_bookings");
  
  // Filters State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");

  // Queries
  const { data: bookingsReport, isLoading: loadingBookings, refetch: refetchBookings } = useQuery({
    queryKey: ["reports-bookings", { status, startDate, endDate, location }],
    queryFn: () => getBookingsReportApi({ status, startDate, endDate, location }),
  });

  const { data: inventoryReport = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["reports-inventory"],
    queryFn: () => getInventoryReportApi(),
  });

  const { data: revenueReport, isLoading: loadingRevenue } = useQuery({
    queryKey: ["reports-revenue", { startDate, endDate }],
    queryFn: () => getRevenueReportApi({ startDate, endDate }),
  });

  const { data: customersReport = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["reports-customers"],
    queryFn: () => getCustomersReportApi(),
  });

  const { data: evaluationsReport, isLoading: loadingEvaluations } = useQuery({
    queryKey: ["reports-evaluations", { startDate, endDate }],
    queryFn: () => getEvaluationsReportApi({ startDate, endDate }),
  });

  const { data: canceledReport = [], isLoading: loadingCanceled } = useQuery({
    queryKey: ["reports-canceled", { startDate, endDate }],
    queryFn: () => getCanceledBookingsReportApi({ startDate, endDate }),
  });

  const { data: upcomingReport = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["reports-upcoming"],
    queryFn: () => getUpcomingBookingsReportApi(7),
  });

  const isTabLoading = useMemo(() => {
    switch (activeTab) {
      case "revenue_bookings": return loadingBookings || loadingRevenue;
      case "inventory_health": return loadingInventory;
      case "client_directory": return loadingCustomers;
      case "quality_crew": return loadingEvaluations;
      case "audit_logs": return loadingCanceled || loadingUpcoming;
    }
  }, [activeTab, loadingBookings, loadingRevenue, loadingInventory, loadingCustomers, loadingEvaluations, loadingCanceled, loadingUpcoming]);

  // Contextual CSV Exporter
  function handleExportCSV() {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `vortex-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === "revenue_bookings") {
      headers = ["Booking Code", "Customer", "Location", "Event Date", "Payment Status", "Payment Amount", "CreatedAt"];
      rows = (bookingsReport?.bookings || []).map((b) => [
        b.id, b.customerName, b.eventLocation, b.eventDate, b.paymentStatus, b.paymentAmount, b.createdAt
      ]);
    } else if (activeTab === "inventory_health") {
      headers = ["Category", "Name", "Total Quantity", "Checked Out", "Damaged", "Missing", "Available", "Unit"];
      inventoryReport.forEach((c) => {
        c.pools.forEach((p) => {
          rows.push([
            c.name, p.name, String(p.totalQuantity), String(p.checkedOutQuantity), 
            String(p.damagedQuantity), String(p.missingQuantity), String(p.availableQuantity), c.unit
          ]);
        });
      });
    } else if (activeTab === "client_directory") {
      headers = ["Customer Name", "Phone", "Total Bookings", "Completed Bookings", "Revenue Contribution"];
      rows = customersReport.map((c) => [
        c.name, c.phone, String(c.totalBookings), String(c.completedBookings), String(c.totalRevenueContributed)
      ]);
    } else if (activeTab === "quality_crew") {
      headers = ["Booking Code", "Client Venue", "Event Date", "Team Size", "Evaluator", "Notes", "Scores"];
      rows = (evaluationsReport?.evaluations || []).map((e) => [
        e.bookingId, e.clientNameVenue, e.eventDate, String(e.teamSize), e.evaluatorName, e.notes,
        e.scores.map((s) => `${s.metricLabel}:${s.score}`).join(" | ")
      ]);
    } else if (activeTab === "audit_logs") {
      headers = ["Log Type", "Booking/Entity", "Event Date", "Location", "Value/Amount", "Canceled By / Crew Count", "Canceled At / Status", "Details / Reason"];
      
      // Merge upcoming forecast and cancellation details into single audit report
      canceledReport.forEach((c) => {
        rows.push([
          "CANCELLATION", c.id, c.eventDate, c.eventLocation, c.paymentAmount, c.canceledBy, c.canceledAt, c.reason
        ]);
      });
      upcomingReport.forEach((u) => {
        rows.push([
          "UPCOMING", u.id, u.eventDate, u.eventLocation, "-", String(u.assignedCrewCount), u.status, u.hasBom ? "BOM Ready" : "BOM Missing"
        ]);
      });
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatus("");
    setLocation("");
  };

  // Helper styles for priority/status indicators
  const getPaymentBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid": return { bg: "rgba(48, 164, 108, 0.15)", color: "#30A46C", label: "Paid" };
      case "advance": return { bg: "rgba(232, 160, 48, 0.15)", color: "#E8A030", label: "Advance" };
      default: return { bg: "rgba(229, 70, 102, 0.15)", color: "#E54666", label: "Unpaid" };
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="label-eyebrow mb-1">Business Intelligence</div>
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight">Operations Reports</h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>Consolidated metrics for booking pipelines, collection summaries, inventory health, and crew scores.</p>
        </div>

        <div className="flex items-center gap-2">
          {isTabLoading && <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 h-8.5 text-[11px] font-bold cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export {TABS.find(t => t.id === activeTab)?.label} CSV
          </Button>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div 
        className="mb-5 rounded-lg border p-4 flex flex-wrap items-center gap-4 text-[12px]"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-1.5 shrink-0" style={{ color: "var(--text-2)" }}>
          <Filter className="h-3.5 w-3.5" />
          <span className="font-bold">Filters:</span>
        </div>

        {/* Date Ranges */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] outline-none"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="Start Date"
          />
          <span style={{ color: "var(--text-3)" }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] outline-none"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="End Date"
          />
        </div>

        {/* Location Filter */}
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Search location..."
          className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] outline-none min-w-[150px] placeholder:text-zinc-500 hover:border-zinc-500 transition"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        />

        {/* Status Filter */}
        {activeTab === "revenue_bookings" && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] outline-none cursor-pointer hover:border-zinc-500 transition"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <option value="">All Statuses</option>
            <option value="RESERVED">Reserved</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARATION">Preparation</option>
            <option value="DONE">Completed</option>
          </select>
        )}

        {(startDate || endDate || location || status) && (
          <button
            onClick={handleClearFilters}
            className="text-[11px] font-bold hover:underline cursor-pointer ml-auto"
            style={{ color: "var(--accent)" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tabs Navigation Header */}
      <div className="scrollable-tabs border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-5 py-3 text-[12.5px] font-bold tracking-tight transition whitespace-nowrap cursor-pointer hover:text-foreground"
              style={{
                color: active ? "var(--foreground)" : "var(--text-2)"
              }}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels Contents */}
      <div className="space-y-5">
        {/* ========================================================================= */}
        {/* TAB 1: REVENUE & BOOKINGS */}
        {/* ========================================================================= */}
        {activeTab === "revenue_bookings" && (
          <div className="space-y-4">
            {/* KPI Cards Strip */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Logged Revenue</span>
                  <Banknote className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </div>
                <div className="mt-3 text-[22px] font-bold">
                  {loadingRevenue ? "..." : `ETB ${(revenueReport?.totalRevenue || 0).toLocaleString()}`}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Aggregated lifetime payments
                </div>
              </div>

              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Total Bookings Count</span>
                  <CalendarCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </div>
                <div className="mt-3 text-[22px] font-bold">
                  {loadingBookings ? "..." : bookingsReport?.totalCount}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Matched bookings by filter
                </div>
              </div>

              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Avg. Booking Value</span>
                  <TrendingUp className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </div>
                <div className="mt-3 text-[22px] font-bold">
                  {loadingBookings ? "..." : `ETB ${Math.round((bookingsReport?.totalBookingAmountValue || 0) / (bookingsReport?.totalCount || 1)).toLocaleString()}`}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Per booking transaction value
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
              {/* Monthly Revenue Trend Chart */}
              <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span className="text-[13px] font-bold">Monthly Revenue Trend</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Trend forecast</span>
                </div>
                <div className="p-4 flex items-end justify-between gap-3 h-64">
                  {loadingRevenue ? (
                    <div className="w-full text-center text-[12px] py-12" style={{ color: "var(--text-3)" }}>Loading chart...</div>
                  ) : Object.keys(revenueReport?.monthlyRevenue || {}).length === 0 ? (
                    <div className="w-full text-center text-[12px] py-12" style={{ color: "var(--text-3)" }}>No chart data</div>
                  ) : (
                    Object.entries(revenueReport?.monthlyRevenue || {}).map(([month, val]) => {
                      const maxVal = Math.max(...Object.values(revenueReport?.monthlyRevenue || { 1: 1 }));
                      const percent = (val / maxVal) * 100;
                      return (
                        <div key={month} className="group flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full relative">
                            <div 
                              className="w-full rounded-t-sm transition-all group-hover:brightness-110"
                              style={{ 
                                height: `${Math.max(5, (percent / 100) * 180)}px`, 
                                background: "var(--accent)", 
                                opacity: 0.8 
                              }}
                            />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--surface-2)] text-[9px] px-1 rounded font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                              ETB {(val / 1000).toFixed(0)}k
                            </div>
                          </div>
                          <span className="text-[10.5px] font-semibold" style={{ color: "var(--text-2)" }}>{month}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status breakdown list */}
              <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span className="text-[13px] font-bold">Booking Pipeline Distribution</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {loadingBookings ? (
                    <div className="text-center text-[12px] py-6" style={{ color: "var(--text-3)" }}>Loading pipeline...</div>
                  ) : (
                    Object.entries(bookingsReport?.statusCounts || {}).map(([state, count]) => {
                      const pct = Math.round((count / (bookingsReport?.totalCount || 1)) * 100);
                      return (
                        <div key={state} className="text-[12px]">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-foreground">{state}</span>
                            <span className="font-mono text-[11px]" style={{ color: "var(--text-3)" }}>{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Payments Ledger */}
            <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <span className="text-[13px] font-bold">Transaction ledger</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[12px] text-left">
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      {["Payment ID", "Booking", "Client", "Amount", "Collection status", "Date Recorded", "Agent"].map((h) => (
                        <th key={h} className="border-b px-4 py-2.5 label-eyebrow" style={{ borderColor: "var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRevenue ? (
                      <tr><td colSpan={7} className="text-center py-6 text-zinc-500">Loading ledger...</td></tr>
                    ) : (revenueReport?.payments || []).length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-zinc-500">No payment logs found</td></tr>
                    ) : (
                      (revenueReport?.payments || []).map((p, idx) => {
                        const style = getPaymentBadgeStyle(p.toStatus);
                        return (
                          <tr 
                            key={p.id} 
                            className="border-b last:border-0 hover:bg-[var(--surface-2)] transition" 
                            style={{ 
                              borderColor: "var(--border)",
                              background: idx % 2 === 0 ? "var(--surface)" : "transparent"
                            }}
                          >
                            <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "var(--text-2)" }}>{p.id}</td>
                            <td className="px-4 py-2.5 font-bold">
                              <Link 
                                to={`/bookings/${p.bookingCode || p.bookingId}` as any} 
                                className="hover:underline cursor-pointer"
                                style={{ color: "var(--accent)" }}
                              >
                                {p.bookingCode || p.bookingId}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 font-medium">{p.customerName}</td>
                            <td className="px-4 py-2.5 font-mono font-bold">ETB {parseFloat(p.amount).toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              <span 
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                style={{ background: style.bg, color: style.color }}
                              >
                                {style.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[11px] font-mono text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-zinc-400">{p.recordedByName}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INVENTORY HEALTH */}
        {/* ========================================================================= */}
        {activeTab === "inventory_health" && (
          <div className="space-y-4">
            {loadingInventory ? (
              <div className="text-center py-12 text-zinc-500">Loading stock reports...</div>
            ) : inventoryReport.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">No inventory pools reported.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {inventoryReport.map((c) => (
                  <div key={c.categoryId} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: "var(--border)" }}>
                      <span className="font-bold text-[14px]" style={{ color: "var(--accent)" }}>{c.name}</span>
                      <span className="text-[10px] uppercase font-mono tracking-wide" style={{ color: "var(--text-3)" }}>
                        {c.trackingType} ({c.unit})
                      </span>
                    </div>

                    <div className="space-y-4">
                      {c.pools.map((p) => {
                        const total = p.totalQuantity || 1;
                        const outPct = Math.min(100, Math.round((p.checkedOutQuantity / total) * 100));
                        const dmgPct = Math.min(100, Math.round((p.damagedQuantity / total) * 100));
                        const misPct = Math.min(100, Math.round((p.missingQuantity / total) * 100));
                        const availPct = Math.max(0, 100 - outPct - dmgPct - misPct);

                        return (
                          <div key={p.poolId} className="text-[12px]">
                            <div className="flex justify-between font-semibold mb-1">
                              <span>{p.name}</span>
                              <span className="font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
                                {p.availableQuantity} / {p.totalQuantity} {c.unit} available
                              </span>
                            </div>

                            {/* Stacked health progress bar */}
                            <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-[var(--surface-2)]">
                              {/* Available (Green) */}
                              <div style={{ width: `${availPct}%`, background: "var(--color-bom-returned)" }} title={`Available: ${availPct}%`} />
                              {/* Checked Out (Blue) */}
                              <div style={{ width: `${outPct}%`, background: "var(--color-status-accepted)" }} title={`Checked Out: ${outPct}%`} />
                              {/* Damaged (Red) */}
                              <div style={{ width: `${dmgPct}%`, background: "var(--destructive)" }} title={`Damaged: ${dmgPct}%`} />
                              {/* Missing (Grey) */}
                              <div style={{ width: `${misPct}%`, background: "var(--color-status-onsite)" }} title={`Missing: ${misPct}%`} />
                            </div>

                            {/* Metric details label strip */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] mt-1.5 font-mono text-zinc-400">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-bom-returned)" }} />
                                Available: {p.availableQuantity}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-status-accepted)" }} />
                                Checked Out: {p.checkedOutQuantity}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--destructive)" }} />
                                Damaged: {p.damagedQuantity}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-status-onsite)" }} />
                                Missing: {p.missingQuantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CLIENT DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === "client_directory" && (
          <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <span className="text-[13px] font-bold">Repeat clients & lifetime valuations</span>
            </div>
            {loadingCustomers ? (
              <div className="text-center py-12 text-zinc-500">Loading directory...</div>
            ) : customersReport.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">No customer logs found</div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[12px] text-left">
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      {["Customer Name", "Contact Phone", "Total Bookings", "Completed Jobs", "Lifetime Revenue contribution"].map((h) => (
                        <th key={h} className="px-4 py-2.5 label-eyebrow border-b" style={{ borderColor: "var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customersReport.map((c, idx) => (
                      <tr 
                        key={c.customerId} 
                        className="border-b last:border-0 hover:bg-[var(--surface-2)] transition"
                        style={{ 
                          borderColor: "var(--border)",
                          background: idx % 2 === 0 ? "var(--surface)" : "transparent"
                        }}
                      >
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                          {c.name}
                          {c.totalBookings >= 5 && (
                            <span 
                              className="rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider" 
                              style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                            >
                              Repeat Client
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{c.phone}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[12px]">{c.totalBookings}</td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{c.completedBookings}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>
                          ETB {c.totalRevenueContributed.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: QUALITY & CREW */}
        {/* ========================================================================= */}
        {activeTab === "quality_crew" && (
          <div className="space-y-4">
            {loadingEvaluations ? (
              <div className="text-center py-12 text-zinc-500">Loading performance data...</div>
            ) : !evaluationsReport ? (
              <div className="text-center py-12 text-zinc-500">No performance logs found.</div>
            ) : (
              <>
                {/* Metric Averages */}
                <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="label-eyebrow border-b pb-2 mb-3" style={{ borderColor: "var(--border)" }}>
                    Overall Metric averages
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(evaluationsReport.metricAverages || {}).map(([key, item]) => {
                      const avg = item.average;
                      // Boolean metrics are expressed as percentages, others as raw values
                      const isPercent = key.includes("ppe") || key.includes("signal");
                      const displayScore = isPercent ? `${avg.toFixed(1)}%` : `${avg.toFixed(2)} / 10`;
                      const pctWidth = isPercent ? avg : avg * 10;
                      
                      return (
                        <div key={key} className="rounded-md border p-3 bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{item.label}</span>
                          <div className="text-[18px] font-bold mt-1" style={{ color: "var(--accent)" }}>{displayScore}</div>
                          <div className="h-1.5 mt-2 rounded-full overflow-hidden bg-zinc-800">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${pctWidth}%` }} />
                          </div>
                          <div className="text-[9px] mt-1 text-zinc-500">{item.count} evaluations logged</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Evaluations Log */}
                <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[13px] font-bold">Post-Event evaluations log</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {evaluationsReport.evaluations.map((e) => (
                      <div 
                        key={e.id} 
                        className="rounded-md border p-4 bg-[var(--surface-2)] flex flex-col md:flex-row gap-4 justify-between"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-bold text-[13px] text-foreground">{e.clientNameVenue}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({new Date(e.eventDate).toLocaleDateString()})</span>
                            <span className="text-[11px] font-bold">
                              Booking: <Link to={`/bookings/${e.bookingCode || e.bookingId}` as any} className="text-[var(--accent)] hover:underline cursor-pointer">{e.bookingCode || e.bookingId}</Link>
                            </span>
                          </div>
                          <p className="text-[11.5px] leading-relaxed text-zinc-300 italic mb-2.5">"{e.notes}"</p>
                          <div className="text-[10px] text-zinc-400">
                            Evaluated by: <span className="font-semibold">{e.evaluatorName}</span> · Team size: <span className="font-semibold">{e.teamSize} crew</span>
                          </div>
                        </div>

                        {/* Scores grid on the side */}
                        <div className="flex flex-wrap gap-2 md:w-56 shrink-0 md:justify-end items-start">
                          {e.scores.map((s) => (
                            <div 
                              key={s.metricId}
                              className="rounded border bg-[var(--surface)] text-[9.5px] px-2 py-1 flex items-center gap-1.5"
                              style={{ borderColor: "var(--border)" }}
                            >
                              <span className="text-zinc-400">{s.metricLabel}:</span>
                              <span className="font-bold font-mono" style={{ color: "var(--accent)" }}>{s.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === "audit_logs" && (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            {/* Canceled Bookings Audit Log */}
            <div className="rounded-lg border flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5" style={{ color: "var(--destructive)" }} />
                  <span className="text-[13px] font-bold">Canceled Bookings Audit Log</span>
                </div>
                <span className="rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">
                  {canceledReport.length} Canceled
                </span>
              </div>
              <div className="p-4 space-y-3.5 flex-grow overflow-y-auto max-h-[500px] scrollbar-thin">
                {loadingCanceled ? (
                  <div className="text-center py-6 text-zinc-500 text-[11px]">Loading cancellation audits...</div>
                ) : canceledReport.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-[11px]">No cancellations recorded</div>
                ) : (
                  canceledReport.map((c) => (
                    <div 
                      key={c.id} 
                      className="rounded border p-3.5 bg-[var(--surface-2)] flex flex-col gap-2.5 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[12.5px]" style={{ color: "var(--accent)" }}>{c.id}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({new Date(c.eventDate).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold text-zinc-400 font-mono">ETB {parseFloat(c.paymentAmount).toLocaleString()}</span>
                      </div>

                      <div className="text-[11.5px] leading-relaxed">
                        <span className="text-zinc-400">Client:</span> <span className="font-medium">{c.customerName}</span> · <span className="text-zinc-400">Venue:</span> <span className="font-medium">{c.eventLocation}</span>
                      </div>

                      <div className="rounded p-2 bg-red-500/5 border border-red-500/10 text-red-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold">Cancellation Reason:</span> "{c.reason}"
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono mt-1 border-t pt-2 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                        <span>Logged By: {c.canceledBy}</span>
                        <span>Date Canceled: {new Date(c.canceledAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Operations (7 Days Forecast Checklist) */}
            <div className="rounded-lg border flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                  <span className="text-[13px] font-bold">7-Day Upcoming Operations Checklist</span>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-grow overflow-y-auto max-h-[500px] scrollbar-thin">
                {loadingUpcoming ? (
                  <div className="text-center py-6 text-zinc-500 text-[11px]">Loading upcoming jobs...</div>
                ) : upcomingReport.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-[11px]">No upcoming jobs in the next 7 days</div>
                ) : (
                  upcomingReport.map((u) => {
                    const hasAlert = !u.hasBom;
                    return (
                      <div 
                        key={u.id} 
                        className={`rounded border p-3.5 flex flex-col gap-2.5 text-[12px] transition ${
                          hasAlert ? "border-red-500/40 bg-red-500/[0.02]" : "bg-[var(--surface-2)]"
                        }`}
                        style={hasAlert ? {} : { borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[12.5px]" style={{ color: "var(--accent)" }}>{u.bookingCode || u.id}</span>
                            <span 
                              className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                              style={{ 
                                background: u.status === "CONFIRMED" ? "rgba(70, 167, 88, 0.15)" : "rgba(232, 160, 48, 0.15)",
                                color: u.status === "CONFIRMED" ? "#46A758" : "#E8A030"
                              }}
                            >
                              {u.status}
                            </span>
                          </div>
                          <span className="font-mono text-[10.5px] text-zinc-400">{new Date(u.eventDate).toLocaleDateString()}</span>
                        </div>

                        <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                          Customer: <span className="font-medium text-foreground">{u.customerName}</span> · Venue: <span className="font-medium text-foreground">{u.eventLocation}</span>
                        </div>

                        {/* BOM warning alarm indicator or crew status */}
                        <div className="flex items-center justify-between border-t pt-2 flex-wrap gap-2 text-[11px]" style={{ borderColor: "var(--border)" }}>
                          <span className="font-semibold" style={{ color: "var(--text-3)" }}>
                            Crew Assigned: <span className="text-foreground">{u.assignedCrewCount} technicians</span>
                          </span>

                          {u.hasBom ? (
                            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                              <Check className="h-3 w-3" /> BOM Checked
                            </span>
                          ) : (
                            <span className="rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                              <AlertCircle className="h-3 w-3" /> BOM Missing - Action Required
                            </span>
                          )}
                        </div>

                        {/* Navigation link to details */}
                        <div className="mt-1 flex justify-end">
                          <Link 
                            to={`/bookings/${u.bookingCode || u.id}` as any}
                            className="text-[11px] font-bold hover:underline cursor-pointer"
                            style={{ color: "var(--accent)" }}
                          >
                            Open Details →
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}