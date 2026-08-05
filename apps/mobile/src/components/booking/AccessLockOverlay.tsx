import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { AppText, Button } from "@/components/ui";
import { requestPermissionApi } from "@/services/notifications-api";
import { colors, radius } from "@/theme/tokens";

interface AccessLockOverlayProps {
  sectionName: string;
  permissionKey: string;
}

/**
 * Mirrors web AccessLockOverlay — request admin grant for a locked section.
 */
export function AccessLockOverlay({ sectionName, permissionKey }: AccessLockOverlayProps) {
  const [requested, setRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      await requestPermissionApi(permissionKey, `Requested view/edit access for ${sectionName}`);
      setRequested(true);
      Alert.alert("Request sent", `Access request for "${permissionKey}" sent to administrators.`);
    } catch (err) {
      Alert.alert("Request failed", err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.iconWrap}>
        <Lock size={22} color={colors.accent} />
      </View>
      <AppText style={{ fontWeight: "800" }}>Access Restricted</AppText>
      <AppText variant="small" color={colors.text2} style={styles.copy}>
        You do not have permission to view or manage the {sectionName} section.
      </AppText>
      <Button
        disabled={requested || isSubmitting}
        onPress={handleRequest}
        variant={requested ? "outline" : "primary"}
      >
        {isSubmitting
          ? "Sending..."
          : requested
            ? "✓ Request Sent to Admin"
            : "Request Permission from Admin"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(18,18,18,0.85)",
    padding: 20,
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  copy: {
    textAlign: "center",
    maxWidth: 260,
    marginBottom: 4,
  },
});
