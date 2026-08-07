import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarCheck,
  Download,
  Gauge,
  PieChart,
  Truck,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  AppText,
  Button,
  ErrorState,
  Input,
  LoadingState,
  ProgressBar,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/theme/tokens";
import { formatCompactCurrency, formatCurrency, pct } from "@/utils/format";
import {
  getBookingsReportApi,
  getCanceledBookingsReportApi,
  getCustomersReportApi,
  getDriverTripsReportApi,
  getEvaluationsReportApi,
  getFreelancerWorkloadReportApi,
  getInventoryReportApi,
  getRevenueReportApi,
  getUpcomingBookingsReportApi,
} from "@/services/reports.api";

const BASE_TABS = [
  "Revenue & Bookings",
  "Inventory Health",
  "Client Directory",
  "Quality & Crew",
  "Audit Logs",
] as const;
const STAFF_WORK_SHEETS_TAB = "Staff Work Sheets" as const;
const TABS = [...BASE_TABS, STAFF_WORK_SHEETS_TAB] as const;

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export default function ReportsScreen() {
  const { authUser } = useAppContext();
  const role = (authUser?.role || "").toLowerCase();
  const isAdminOrSupervisor = role === "admin" || role === "supervisor";
  const canViewStaffWorkSheets = isAdminOrSupervisor;
  const visibleTabs = canViewStaffWorkSheets ? TABS : BASE_TABS;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Revenue & Bookings");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [sheetStartDate, setSheetStartDate] = useState("");
  const [sheetEndDate, setSheetEndDate] = useState("");

  const bookingsQuery = useQuery({
    queryKey: ["reports-bookings", { status, startDate, endDate, location }],
    queryFn: () => getBookingsReportApi({ status, startDate, endDate, location }),
  });
  const revenueQuery = useQuery({
    queryKey: ["reports-revenue", { startDate, endDate }],
    queryFn: () => getRevenueReportApi({ startDate, endDate }),
  });
  const inventoryQuery = useQuery({
    queryKey: ["reports-inventory"],
    queryFn: () => getInventoryReportApi(),
  });
  const customersQuery = useQuery({
    queryKey: ["reports-customers"],
    queryFn: () => getCustomersReportApi(),
  });
  const evaluationsQuery = useQuery({
    queryKey: ["reports-evaluations", { startDate, endDate }],
    queryFn: () => getEvaluationsReportApi({ startDate, endDate }),
  });
  const canceledQuery = useQuery({
    queryKey: ["reports-canceled", { startDate, endDate }],
    queryFn: () => getCanceledBookingsReportApi({ startDate, endDate }),
  });
  const upcomingQuery = useQuery({
    queryKey: ["reports-upcoming"],
    queryFn: () => getUpcomingBookingsReportApi(7),
  });
  const freelancerQuery = useQuery({
    queryKey: ["reports-freelancer-workload", { startDate: sheetStartDate, endDate: sheetEndDate }],
    queryFn: () =>
      getFreelancerWorkloadReportApi({
        startDate: sheetStartDate || undefined,
        endDate: sheetEndDate || undefined,
      }),
    enabled: canViewStaffWorkSheets && tab === STAFF_WORK_SHEETS_TAB,
  });
  const driverTripsReportQuery = useQuery({
    queryKey: ["reports-driver-trips", { startDate: sheetStartDate, endDate: sheetEndDate }],
    queryFn: () =>
      getDriverTripsReportApi({
        startDate: sheetStartDate || undefined,
        endDate: sheetEndDate || undefined,
      }),
    enabled: canViewStaffWorkSheets && tab === STAFF_WORK_SHEETS_TAB,
  });

  const safeTab = (visibleTabs as readonly string[]).includes(tab)
    ? tab
    : ("Revenue & Bookings" as const);

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Business Intelligence</AppText>
        <AppText variant="title">Operations Reports</AppText>
        <AppText variant="subtitle">
          Booking, revenue, equipment, and crew performance from the reporting APIs.
        </AppText>
      </View>

      <Section title="Filters" icon={BarChart3}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.text2}>
              Start date
            </AppText>
            <Input value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.text2}>
              End date
            </AppText>
            <Input value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.text2}>
              Status
            </AppText>
            <Input
              value={status}
              onChangeText={setStatus}
              placeholder="e.g. CONFIRMED"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="small" color={colors.text2}>
              Location
            </AppText>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="Search location..."
            />
          </View>
        </View>
      </Section>

      <SegmentedTabs
        tabs={visibleTabs}
        value={safeTab}
        onChange={(next) => setTab(next as (typeof TABS)[number])}
      />

      {safeTab === "Revenue & Bookings" ? (
        <RevenueBookingsTab
          bookingsQuery={bookingsQuery}
          revenueQuery={revenueQuery}
        />
      ) : null}
      {safeTab === "Inventory Health" ? <InventoryHealthTab query={inventoryQuery} /> : null}
      {safeTab === "Client Directory" ? <ClientDirectoryTab query={customersQuery} /> : null}
      {safeTab === "Quality & Crew" ? <QualityCrewTab query={evaluationsQuery} /> : null}
      {safeTab === "Audit Logs" ? (
        <AuditLogsTab canceledQuery={canceledQuery} upcomingQuery={upcomingQuery} />
      ) : null}
      {safeTab === STAFF_WORK_SHEETS_TAB && canViewStaffWorkSheets ? (
        <StaffWorkSheetsTab
          sheetStartDate={sheetStartDate}
          sheetEndDate={sheetEndDate}
          setSheetStartDate={setSheetStartDate}
          setSheetEndDate={setSheetEndDate}
          freelancerQuery={freelancerQuery}
          driverTripsReportQuery={driverTripsReportQuery}
        />
      ) : null}
    </Screen>
  );
}

function RevenueBookingsTab({
  bookingsQuery,
  revenueQuery,
}: {
  bookingsQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getBookingsReportApi>>>>;
  revenueQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getRevenueReportApi>>>>;
}) {
  if (bookingsQuery.isLoading || revenueQuery.isLoading) {
    return <LoadingState label="Loading revenue & bookings..." />;
  }
  if (bookingsQuery.isError || revenueQuery.isError) {
    return (
      <ErrorState
        detail="Could not load bookings/revenue reports."
        onRetry={() => {
          bookingsQuery.refetch();
          revenueQuery.refetch();
        }}
      />
    );
  }

  const bookingsReport = bookingsQuery.data!;
  const revenueReport = revenueQuery.data!;
  const monthly = Object.entries(revenueReport.monthlyRevenue || {}).map(([m, revenue]) => ({
    m,
    revenue,
  }));
  const maxRevenue = Math.max(1, ...monthly.map((row) => row.revenue));

  return (
    <>
      <View style={{ gap: 12 }}>
        <StatCard
          label="Booked Revenue"
          value={formatCompactCurrency(revenueReport.totalRevenue || bookingsReport.totalBookingAmountValue || 0)}
          note={`${bookingsReport.totalCount} bookings`}
          icon={Banknote}
        />
        <StatCard
          label="Booking Count"
          value={bookingsReport.totalCount}
          note="Filtered window"
          icon={CalendarCheck}
        />
        <StatCard
          label="Avg. Job Value"
          value={
            bookingsReport.totalCount
              ? formatCompactCurrency(
                  (bookingsReport.totalBookingAmountValue || 0) / bookingsReport.totalCount,
                )
              : "—"
          }
          note="Contract average"
          icon={Banknote}
        />
      </View>

      <Section title="Revenue Trend" icon={BarChart3} aside="Monthly">
        {monthly.length === 0 ? (
          <AppText variant="subtitle">No monthly revenue data for this range.</AppText>
        ) : (
          <View style={styles.chart}>
            {monthly.map((month) => (
              <View key={month.m} style={styles.barWrap}>
                <View
                  style={[styles.bar, { height: Math.max(20, (month.revenue / maxRevenue) * 190) }]}
                />
                <AppText variant="small" style={{ fontWeight: "800" }}>
                  {month.m}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Booking Status Distribution" icon={PieChart}>
        {Object.entries(bookingsReport.statusCounts || {}).map(([status, count]) => (
          <View key={status} style={styles.lineTop}>
            <AppText variant="eyebrow">{status}</AppText>
            <AppText variant="data" style={{ fontWeight: "900" }}>
              {count}
            </AppText>
          </View>
        ))}
      </Section>

      <Section title="Recent Bookings" icon={CalendarCheck}>
        {(bookingsReport.bookings || []).slice(0, 12).map((booking) => (
          <View key={`${booking.bookingCode}-${booking.createdAt}`} style={styles.lineTop}>
            <View>
              <AppText style={{ fontWeight: "800" }}>{booking.bookingCode}</AppText>
              <AppText variant="small" color={colors.text2}>
                {booking.customerName} · {booking.status}
              </AppText>
            </View>
            <AppText variant="data" color={colors.accent}>
              {formatCurrency(Number(booking.paymentAmount) || 0)}
            </AppText>
          </View>
        ))}
      </Section>

      <Section title="Export" icon={Download}>
        <Button
          variant="outline"
          icon={Download}
          onPress={() => {
            const csv = toCsv(
              (bookingsReport.bookings || []).map((b) => ({
                code: b.bookingCode,
                client: b.customerName,
                status: b.status,
                payment: b.paymentStatus,
                amount: b.paymentAmount,
                eventDate: b.eventDate,
              })),
            );
            Share.share({ message: csv, title: "Revenue & Bookings Report" });
          }}
        >
          Export Revenue & Bookings CSV
        </Button>
      </Section>
    </>
  );
}

function InventoryHealthTab({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getInventoryReportApi>>>>;
}) {
  if (query.isLoading) return <LoadingState label="Loading inventory report..." />;
  if (query.isError) {
    return <ErrorState detail="Could not load inventory report." onRetry={() => query.refetch()} />;
  }
  const categories = query.data || [];

  return (
    <View style={{ gap: 12 }}>
      {categories.length === 0 ? (
        <AppText variant="subtitle">No inventory categories in report.</AppText>
      ) : (
        categories.map((category) => {
          const total = category.pools.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
          const available = category.pools.reduce((sum, p) => sum + (p.availableQuantity || 0), 0);
          const onsite = category.pools.reduce((sum, p) => sum + (p.checkedOutQuantity || 0), 0);
          const damaged = category.pools.reduce((sum, p) => sum + (p.damagedQuantity || 0), 0);
          const availPct = pct(available, total);
          const onsitePct = pct(onsite, total);
          const damagedPct = pct(damaged, total);
          return (
            <Section key={category.categoryId} title={category.name} icon={Gauge} aside={`${total} total`}>
              <View style={styles.healthBar}>
                <View
                  style={[
                    styles.healthSegment,
                    { flex: Math.max(availPct, 0.001), backgroundColor: colors.success },
                  ]}
                />
                <View
                  style={[
                    styles.healthSegment,
                    { flex: Math.max(onsitePct, 0.001), backgroundColor: colors.status.ACCEPTED },
                  ]}
                />
                <View
                  style={[
                    styles.healthSegment,
                    { flex: Math.max(damagedPct, 0.001), backgroundColor: colors.destructive },
                  ]}
                />
              </View>
              <View style={styles.healthLegendRow}>
                <LegendDot label={`Available ${available}`} tone={colors.success} />
                <LegendDot label={`Checked out ${onsite}`} tone={colors.status.ACCEPTED} />
                <LegendDot label={`Damaged ${damaged}`} tone={colors.destructive} />
              </View>
              {category.pools.map((pool) => (
                <View key={pool.poolId} style={styles.lineTop}>
                  <AppText variant="small">{pool.name}</AppText>
                  <AppText variant="data">{pool.availableQuantity}/{pool.totalQuantity}</AppText>
                </View>
              ))}
            </Section>
          );
        })
      )}
      <Section title="Export" icon={Download}>
        <Button
          variant="outline"
          icon={Download}
          onPress={() => {
            const csv = toCsv(
              categories.flatMap((category) =>
                category.pools.map((p) => ({
                  category: category.name,
                  pool: p.name,
                  total: p.totalQuantity || 0,
                  available: p.availableQuantity || 0,
                  checkedOut: p.checkedOutQuantity || 0,
                  damaged: p.damagedQuantity || 0,
                })),
              ),
            );
            Share.share({ message: csv, title: "Inventory Health Report" });
          }}
        >
          Export Inventory CSV
        </Button>
      </Section>
    </View>
  );
}

function LegendDot({ label, tone }: { label: string; tone: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
      <AppText variant="small" color={colors.text2}>
        {label}
      </AppText>
    </View>
  );
}

function ClientDirectoryTab({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getCustomersReportApi>>>>;
}) {
  if (query.isLoading) return <LoadingState label="Loading clients..." />;
  if (query.isError) {
    return <ErrorState detail="Could not load customers report." onRetry={() => query.refetch()} />;
  }
  const clients = [...(query.data || [])].sort(
    (a, b) => b.totalRevenueContributed - a.totalRevenueContributed,
  );

  return (
    <Section title="Repeat clients & lifetime valuations" icon={Users}>
      <View style={{ gap: 14 }}>
        {clients.map((client) => (
          <View key={client.customerId} style={{ gap: 4 }}>
            <View style={styles.lineTop}>
              <AppText style={{ fontWeight: "800" }}>{client.name}</AppText>
              {client.totalBookings >= 5 ? (
                <View style={styles.repeatBadge}>
                  <AppText variant="small" color={colors.accent} style={{ fontWeight: "800" }}>
                    Repeat Client
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.lineTop}>
              <AppText variant="small" color={colors.text2}>
                {client.totalBookings} bookings · {client.completedBookings} completed
              </AppText>
              <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                {formatCurrency(client.totalRevenueContributed)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <Button
        variant="outline"
        icon={Download}
        onPress={() => {
          const csv = toCsv(
            clients.map((c) => ({
              name: c.name,
              bookings: c.totalBookings,
              completed: c.completedBookings,
              revenue: c.totalRevenueContributed,
            })),
          );
          Share.share({ message: csv, title: "Client Directory Report" });
        }}
      >
        Export Clients CSV
      </Button>
    </Section>
  );
}

function QualityCrewTab({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getEvaluationsReportApi>>>>;
}) {
  if (query.isLoading) return <LoadingState label="Loading evaluations..." />;
  if (query.isError) {
    return (
      <ErrorState detail="Could not load evaluations report." onRetry={() => query.refetch()} />
    );
  }
  const report = query.data!;
  const averages = Object.entries(report.metricAverages || {});

  return (
    <View style={{ gap: 12 }}>
      <Section title="Metric Averages" icon={Users}>
        {averages.length === 0 ? (
          <AppText variant="subtitle">No evaluation metrics in range.</AppText>
        ) : (
          averages.map(([key, metric]) => (
            <View key={key} style={{ gap: 6 }}>
              <View style={styles.lineTop}>
                <AppText style={{ fontWeight: "800" }}>{metric.label}</AppText>
                <AppText variant="data">{metric.average.toFixed(1)}</AppText>
              </View>
              <ProgressBar value={Math.min(100, Math.round((metric.average / 10) * 100))} />
            </View>
          ))
        )}
      </Section>
      <Section title="Recent Evaluations" icon={BarChart3}>
        {(report.evaluations || []).slice(0, 12).map((evaluation) => (
          <View key={evaluation.id} style={styles.lineTop}>
            <View>
              <AppText style={{ fontWeight: "800" }}>{evaluation.bookingCode}</AppText>
              <AppText variant="small" color={colors.text2}>
                {evaluation.clientNameVenue} · {evaluation.evaluatorName}
              </AppText>
            </View>
            <AppText variant="data">{evaluation.teamSize} crew</AppText>
          </View>
        ))}
      </Section>
      <Section title="Export" icon={Download}>
        <Button
          variant="outline"
          icon={Download}
          onPress={() => {
            const csv = toCsv(
              (report.evaluations || []).map((e) => ({
                booking: e.bookingCode,
                client: e.clientNameVenue,
                evaluator: e.evaluatorName,
                crew: e.teamSize,
              })),
            );
            Share.share({ message: csv, title: "Quality & Crew Report" });
          }}
        >
          Export Evaluations CSV
        </Button>
      </Section>
    </View>
  );
}

function AuditLogsTab({
  canceledQuery,
  upcomingQuery,
}: {
  canceledQuery: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof getCanceledBookingsReportApi>>>
  >;
  upcomingQuery: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof getUpcomingBookingsReportApi>>>
  >;
}) {
  if (canceledQuery.isLoading || upcomingQuery.isLoading) {
    return <LoadingState label="Loading audit logs..." />;
  }
  if (canceledQuery.isError || upcomingQuery.isError) {
    return (
      <ErrorState
        detail="Could not load canceled/upcoming reports."
        onRetry={() => {
          canceledQuery.refetch();
          upcomingQuery.refetch();
        }}
      />
    );
  }

  const canceled = canceledQuery.data || [];
  const upcoming = upcomingQuery.data || [];

  return (
    <>
      <Section title="Canceled Bookings Audit Log" icon={AlertTriangle} aside={`${canceled.length}`}>
        {canceled.length === 0 ? (
          <AppText variant="subtitle">No cancellations recorded in the current period.</AppText>
        ) : (
          <View style={{ gap: 10 }}>
            {canceled.map((booking) => (
              <View key={booking.id || booking.bookingCode} style={{ gap: 2 }}>
                <View style={styles.lineTop}>
                  <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                    {booking.bookingCode}
                  </AppText>
                  <AppText variant="small" color={colors.text2}>
                    {booking.customerName}
                  </AppText>
                </View>
                <AppText variant="small" color={colors.text3}>
                  {booking.reason || "No reason"} · {booking.canceledBy || "—"}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>
      <Section title="Upcoming Operations" icon={CalendarCheck} aside="Next 7 days">
        {upcoming.length === 0 ? (
          <AppText variant="subtitle">Nothing scheduled in the next 7 days.</AppText>
        ) : (
          <View style={{ gap: 10 }}>
            {upcoming.map((booking) => (
              <View key={booking.id || booking.bookingCode} style={styles.lineTop}>
                <View>
                  <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                    {booking.bookingCode}
                  </AppText>
                  <AppText variant="small" color={colors.text2}>
                    {booking.customerName} · {booking.eventLocation}
                  </AppText>
                </View>
                <AppText variant="data" color={colors.text3}>
                  {booking.eventDate?.slice(0, 10)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>
      <Section title="Export" icon={Download}>
        <Button
          variant="outline"
          icon={Download}
          onPress={() => {
            const canceledRows = canceled.map((b) => ({
              type: "CANCELED",
              code: b.bookingCode,
              client: b.customerName,
              reason: b.reason || "",
              by: b.canceledBy || "",
            }));
            const upcomingRows = upcoming.map((b) => ({
              type: "UPCOMING",
              code: b.bookingCode,
              client: b.customerName,
              location: b.eventLocation,
              date: b.eventDate || "",
            }));
            Share.share({
              message: toCsv([...canceledRows, ...upcomingRows]),
              title: "Audit Logs Report",
            });
          }}
        >
          Export Audit CSV
        </Button>
      </Section>
    </>
  );
}

function StaffWorkSheetsTab({
  sheetStartDate,
  sheetEndDate,
  setSheetStartDate,
  setSheetEndDate,
  freelancerQuery,
  driverTripsReportQuery,
}: {
  sheetStartDate: string;
  sheetEndDate: string;
  setSheetStartDate: (value: string) => void;
  setSheetEndDate: (value: string) => void;
  freelancerQuery: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof getFreelancerWorkloadReportApi>>>
  >;
  driverTripsReportQuery: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof getDriverTripsReportApi>>>
  >;
}) {
  const freelancers = freelancerQuery.data || [];
  const trips = driverTripsReportQuery.data || [];

  return (
    <View style={{ gap: 12 }}>
      <Section title="Work Sheet Filters" icon={Users}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Input
              value={sheetStartDate}
              onChangeText={setSheetStartDate}
              placeholder="Start YYYY-MM-DD"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              value={sheetEndDate}
              onChangeText={setSheetEndDate}
              placeholder="End YYYY-MM-DD"
            />
          </View>
        </View>
      </Section>

      <Section title="Freelancer Workload" icon={Users} aside={`${freelancers.length}`}>
        {freelancerQuery.isLoading ? (
          <LoadingState label="Loading freelancer workload..." />
        ) : freelancerQuery.isError ? (
          <ErrorState
            detail="Could not load freelancer workload."
            onRetry={() => freelancerQuery.refetch()}
          />
        ) : freelancers.length === 0 ? (
          <AppText variant="subtitle">No freelancer workload in this range.</AppText>
        ) : (
          freelancers.map((row) => (
            <View key={row.userId} style={styles.lineTop}>
              <View>
                <AppText style={{ fontWeight: "800" }}>{row.name}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {row.email || "—"}
                </AppText>
              </View>
              <AppText variant="data">
                {row.bookingsCount} jobs · {row.sqmCovered} sqm
              </AppText>
            </View>
          ))
        )}
      </Section>

      <Section title="Driver Trips Summary" icon={Truck} aside={`${trips.length}`}>
        {driverTripsReportQuery.isLoading ? (
          <LoadingState label="Loading driver trips report..." />
        ) : driverTripsReportQuery.isError ? (
          <ErrorState
            detail="Could not load driver trips report."
            onRetry={() => driverTripsReportQuery.refetch()}
          />
        ) : trips.length === 0 ? (
          <AppText variant="subtitle">No driver trip metrics in this range.</AppText>
        ) : (
          trips.map((row) => (
            <View key={row.driverUserId} style={styles.lineTop}>
              <View>
                <AppText style={{ fontWeight: "800" }}>{row.name}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {row.approvedCount} approved · {row.pendingCount} pending · {row.rejectedCount}{" "}
                  rejected
                </AppText>
              </View>
              <AppText variant="data">{row.tripsCount} trips</AppText>
            </View>
          ))
        )}
      </Section>

      <Section title="Export" icon={Download}>
        <Button
          variant="outline"
          icon={Download}
          onPress={() => {
            const freelanceRows = freelancers.map((row) => ({
              sheet: "freelancer",
              name: row.name,
              email: row.email || "",
              bookings: row.bookingsCount,
              sqm: row.sqmCovered,
            }));
            const tripRows = trips.map((row) => ({
              sheet: "driver",
              name: row.name,
              trips: row.tripsCount,
              approved: row.approvedCount,
              pending: row.pendingCount,
              rejected: row.rejectedCount,
            }));
            Share.share({
              message: toCsv([...freelanceRows, ...tripRows]),
              title: "Staff Work Sheets Report",
            });
          }}
        >
          Export Staff Work Sheets CSV
        </Button>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 250,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingLeft: 8,
    paddingBottom: 8,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  bar: {
    width: "100%",
    backgroundColor: colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  lineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  healthBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  healthSegment: {
    height: "100%",
  },
  healthLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  repeatBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(245,183,49,0.12)",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
  },
});
