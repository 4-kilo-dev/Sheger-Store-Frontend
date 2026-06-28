import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, RotateCcw } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { AppText, Button, Card } from "@/components/ui";
import { colors, radius } from "@/theme/tokens";

export default function OtpScreen() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<TextInput | null>>([]);
  const complete = useMemo(() => digits.every(Boolean), [digits]);

  const setDigit = (index: number, value: string) => {
    const nextValue = value.slice(-1);
    setDigits((current) => current.map((digit, itemIndex) => (itemIndex === index ? nextValue : digit)));
    if (nextValue && index < 5) inputs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Card style={styles.card}>
        <AppText variant="eyebrow" color={colors.accent}>
          Secure verification
        </AppText>
        <AppText variant="title" style={{ fontSize: 24 }}>
          Enter your 6-digit code
        </AppText>
        <AppText variant="subtitle">
          We sent a one-time code to <AppText variant="data">+251 911 ... 611</AppText>. It expires in 05:00.
        </AppText>
        <View style={styles.digitRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              accessibilityLabel={`Digit ${index + 1}`}
              value={digit}
              maxLength={1}
              keyboardType="number-pad"
              onChangeText={(value) => setDigit(index, value)}
              selectionColor={colors.accent}
              style={styles.digitInput}
            />
          ))}
        </View>
        <Button icon={ArrowRight} disabled={!complete} onPress={() => router.replace("/dashboard")}>
          Verify & open dashboard
        </Button>
        <Button variant="ghost" icon={RotateCcw}>
          Resend code
        </Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    padding: 20,
    gap: 16,
  },
  digitRow: {
    flexDirection: "row",
    gap: 8,
  },
  digitInput: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.foreground,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
  },
});
