import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  BottomSheet,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
} from "@/components/ui";
import {
  useDriverTrips,
  useCreateDriverTrip,
  useApproveDriverTrip,
  useUpdateDriverTrip,
  useStaff,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors } from "@/theme/tokens";
import { Truck } from "lucide-react-native";

const TABS = ["All Trips", "Pending", "Approved", "Rejected"] as const;

function toIsoFromLocal(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function DriverTripsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Trips");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const listFilters = useMemo(
    () => ({
      from: toIsoFromLocal(from),
      to: toIsoFromLocal(to),
      driverUserId: filterDriverId || undefined,
    }),
    [from, to, filterDriverId],
  );
  const { data: trips = [], isLoading, isError, refetch } = useDriverTrips(listFilters);
  const { data: staff = [] } = useStaff();
  const { can } = usePermissions();
  const canView = can(PERMISSION.DRIVER_TRIP_VIEW);
  const canCreate = can(PERMISSION.DRIVER_TRIP_CREATE);
  const canEdit = can(PERMISSION.DRIVER_TRIP_EDIT);
  const canApprove = can(PERMISSION.DRIVER_TRIP_APPROVE);
  const createTrip = useCreateDriverTrip();
  const approveTrip = useApproveDriverTrip();
  const updateTrip = useUpdateDriverTrip();

  const [showCreate, setShowCreate] = useState(false);
  const [reason, setReason] = useState("");
  const [plate, setPlate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [leftAt, setLeftAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    switch (tab) {
      case "Pending":
        return trips.filter((t) => t.isApproved === null);
      case "Approved":
        return trips.filter((t) => t.isApproved === true);
      case "Rejected":
        return trips.filter((t) => t.isApproved === false);
      default:
        return trips;
    }
  }, [trips, tab]);

  const handleCreate = async () => {
    setCreateError(null);
    const leftIso = toIsoFromLocal(leftAt);
    if (!selectedDriver) {
      setCreateError("Select a driver.");
      return;
    }
    if (!leftIso) {
      setCreateError("Enter a valid leave time (YYYY-MM-DDTHH:mm).");
      return;
    }
    if (!reason.trim()) {
      setCreateError("Enter a reason or destination.");
      return;
    }
    const arrivedIso = toIsoFromLocal(arrivedAt);
    if (arrivedIso && new Date(arrivedIso).getTime() < new Date(leftIso).getTime()) {
      setCreateError("Arrive time must be on or after leave time.");
      return;
    }
    try {
      await createTrip.mutateAsync({
        driverUserId: selectedDriver,
        leftAt: leftIso,
        reason,
        plate: plate || undefined,
        arrivedAt: arrivedIso,
      });
      setShowCreate(false);
      setReason("");
      setPlate("");
      setSelectedDriver("");
      setLeftAt("");
      setArrivedAt("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create trip.");
    }
  };

  const handleApprove = async (id: string, isApproved: boolean) => {
    try {
      await approveTrip.mutateAsync({ id, isApproved });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update trip approval.");
    }
  };

  const handleMarkArrived = async (id: string) => {
    try {
      await updateTrip.mutateAsync({ id, payload: { arrivedAt: new Date().toISOString() } });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to mark trip arrived.");
    }
  };

  if (!canView) {
    return (
      <Screen>
        <ErrorState detail="You don't have access to driver trips." />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading driver trips..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load driver trips." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        canCreate ? <Button onPress={() => setShowCreate(true)}>New Driver Trip</Button> : null
      }
    >
      <View>
        <AppText variant="eyebrow">Logistics</AppText>
        <AppText variant="title">Driver Trips</AppText>
        <AppText variant="subtitle">Track driver departures, arrivals, and approvals.</AppText>
      </View>
      <Section title="Filters">
        <Field label="From (YYYY-MM-DDTHH:mm)">
          <Input value={from} onChangeText={setFrom} placeholder="2026-08-01T08:00" />
        </Field>
        <Field label="To (YYYY-MM-DDTHH:mm)">
          <Input value={to} onChangeText={setTo} placeholder="2026-08-31T23:59" />
        </Field>
        <Field label="Driver">
          <View style={styles.chipWrap}>
            <Chip
              label="All drivers"
              active={!filterDriverId}
              onPress={() => setFilterDriverId("")}
            />
            {staff.map((member) => (
              <Chip
                key={member.id}
                label={member.name}
                active={filterDriverId === member.id}
                onPress={() =>
                  setFilterDriverId((current) => (current === member.id ? "" : member.id))
                }
              />
            ))}
          </View>
        </Field>
        {from || to || filterDriverId ? (
          <Button
            variant="outline"
            onPress={() => {
              setFrom("");
              setTo("");
              setFilterDriverId("");
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </Section>
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      <View style={{ gap: 12 }}>
        {filtered.map((trip) => (
          <Section
            key={trip.id}
            title={trip.driver?.name || "Unknown Driver"}
            aside={trip.isApproved === null ? "Pending" : trip.isApproved ? "Approved" : "Rejected"}
            icon={Truck}
          >
            <View style={{ gap: 8 }}>
              <View style={styles.row}>
                <AppText variant="small" color={colors.text2}>
                  Booking
                </AppText>
                <AppText variant="data">{trip.booking?.bookingCode || "—"}</AppText>
              </View>
              <View style={styles.row}>
                <AppText variant="small" color={colors.text2}>
                  Location
                </AppText>
                <AppText variant="data">{trip.booking?.eventLocation || trip.reason}</AppText>
              </View>
              <View style={styles.row}>
                <AppText variant="small" color={colors.text2}>
                  Left At
                </AppText>
                <AppText variant="data">
                  {trip.leftAt ? new Date(trip.leftAt).toLocaleString() : "—"}
                </AppText>
              </View>
              <View style={styles.row}>
                <AppText variant="small" color={colors.text2}>
                  Arrived At
                </AppText>
                <AppText variant="data">
                  {trip.arrivedAt ? new Date(trip.arrivedAt).toLocaleString() : "—"}
                </AppText>
              </View>
              {trip.plate ? (
                <View style={styles.row}>
                  <AppText variant="small" color={colors.text2}>
                    Plate
                  </AppText>
                  <AppText variant="data">{trip.plate}</AppText>
                </View>
              ) : null}
              {trip.isApproved === null && canApprove ? (
                <View style={styles.actionRow}>
                  <Button
                    variant="outline"
                    onPress={() => handleApprove(trip.id, true)}
                    disabled={approveTrip.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => handleApprove(trip.id, false)}
                    disabled={approveTrip.isPending}
                  >
                    Reject
                  </Button>
                </View>
              ) : null}
              {!trip.arrivedAt && canEdit ? (
                <Button
                  variant="outline"
                  onPress={() => handleMarkArrived(trip.id)}
                  disabled={updateTrip.isPending}
                >
                  Mark Arrived
                </Button>
              ) : null}
            </View>
          </Section>
        ))}
        {filtered.length === 0 ? (
          <Section title="No trips">
            <AppText variant="subtitle" style={{ textAlign: "center", paddingVertical: 24 }}>
              No driver trips found for this filter.
            </AppText>
          </Section>
        ) : null}
      </View>

      {showCreate && (
        <BottomSheet
          visible={showCreate}
          title="New Driver Trip"
          onClose={() => setShowCreate(false)}
        >
          <Field label="Driver">
            <View style={styles.chipWrap}>
              {staff.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  active={selectedDriver === member.id}
                  onPress={() => setSelectedDriver(member.id)}
                />
              ))}
            </View>
          </Field>
          <Field label="Reason / Destination">
            <Input value={reason} onChangeText={setReason} placeholder="e.g. Delivery to venue" />
          </Field>
          <Field label="Plate Number (optional)">
            <Input value={plate} onChangeText={setPlate} placeholder="ABC-1234" />
          </Field>
          <Field label="Leave time (YYYY-MM-DDTHH:mm)">
            <Input value={leftAt} onChangeText={setLeftAt} placeholder="2026-08-03T08:00" />
          </Field>
          <Field label="Arrive time (optional)">
            <Input value={arrivedAt} onChangeText={setArrivedAt} placeholder="2026-08-03T18:00" />
          </Field>
          {createError ? (
            <AppText variant="small" color={colors.destructive}>
              {createError}
            </AppText>
          ) : null}
          <View style={styles.actionRow}>
            <Button variant="outline" onPress={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onPress={handleCreate} disabled={createTrip.isPending}>
              {createTrip.isPending ? "Saving..." : "Create Trip"}
            </Button>
          </View>
        </BottomSheet>
      )}
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "800" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.10)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
