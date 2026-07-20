import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
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

export default function DriverTripsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Trips");
  const { data: trips = [], isLoading, isError, refetch } = useDriverTrips();
  const { data: staff = [] } = useStaff();
  const { can } = usePermissions();
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
    if (!selectedDriver) {
      setCreateError("Select a driver.");
      return;
    }
    if (!reason.trim()) {
      setCreateError("Enter a reason or destination.");
      return;
    }
    try {
      await createTrip.mutateAsync({
        driverUserId: selectedDriver,
        leftAt: new Date().toISOString(),
        reason,
        plate: plate || undefined,
      });
      setShowCreate(false);
      setReason("");
      setPlate("");
      setSelectedDriver("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create trip.");
    }
  };

  const handleApprove = async (id: string, isApproved: boolean) => {
    try {
      await approveTrip.mutateAsync({ id, isApproved });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkArrived = async (id: string) => {
    try {
      await updateTrip.mutateAsync({ id, payload: { arrivedAt: new Date().toISOString() } });
    } catch (e) {
      console.error(e);
    }
  };

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
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <AppText variant="title" style={{ marginBottom: 12 }}>
              New Driver Trip
            </AppText>
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
          </View>
        </View>
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
  modal: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
});
