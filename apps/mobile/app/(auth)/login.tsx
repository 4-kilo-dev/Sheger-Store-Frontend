import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, LockKeyhole } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { z } from "zod";
import { AppText, BrandMark, Button, Field, Input } from "@/components/ui";
import { colors } from "@/theme/tokens";

const loginSchema = z.object({
  phone: z.string().min(5, "Phone number is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: { phone: "+251 " },
    resolver: zodResolver(loginSchema),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <View style={styles.hero}>
        <BrandMark />
        <View>
          <AppText variant="eyebrow" color={colors.accent}>
            Operations platform
          </AppText>
          <AppText variant="title" style={styles.heroTitle}>
            Every screen. Every crew. One clear operation.
          </AppText>
          <AppText variant="subtitle" style={{ marginTop: 12 }}>
            Coordinate bookings, warehouse movement, installations, and client delivery from a
            single control room.
          </AppText>
        </View>
        <AppText variant="small" color={colors.text3}>
          Internal access · Addis Ababa, Ethiopia
        </AppText>
      </View>

      <View style={styles.formPanel}>
        <LockKeyhole size={28} color={colors.accent} />
        <AppText variant="title" style={{ fontSize: 24 }}>
          Sign in to operations
        </AppText>
        <AppText variant="subtitle">
          Use your staff phone number to receive a one-time code.
        </AppText>
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field label="Phone number">
              <Input value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
              {fieldState.error ? (
                <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                  {fieldState.error.message}
                </AppText>
              ) : null}
            </Field>
          )}
        />
        <Button icon={ArrowRight} onPress={handleSubmit(() => router.push(to("/otp")))}>
          Continue
        </Button>
        <AppText variant="small" color={colors.text3} style={{ textAlign: "center" }}>
          Access is restricted to authorized Vortex Visual staff.
        </AppText>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTitle: {
    marginTop: 16,
    fontSize: 36,
    lineHeight: 40,
  },
  formPanel: {
    gap: 18,
    padding: 24,
    paddingBottom: 36,
  },
});
