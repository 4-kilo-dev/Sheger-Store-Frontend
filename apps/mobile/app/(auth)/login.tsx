import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, LockKeyhole } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { z } from "zod";
import { AppText, BrandMark, Button, Field, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/theme/tokens";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login, mustChangePassword } = useAppContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      router.replace(to(mustChangePassword ? "/change-password" : "/dashboard"));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Incorrect email or password");
    } finally {
      setSubmitting(false);
    }
  };

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
        <AppText variant="subtitle">Enter your credentials to sign in.</AppText>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Field label="Email address">
              <Input
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="your-email@example.com"
              />
              {fieldState.error ? (
                <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                  {fieldState.error.message}
                </AppText>
              ) : null}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field label="Password">
              <Input
                value={field.value}
                onChangeText={field.onChange}
                secureTextEntry
                autoCapitalize="none"
              />
              {fieldState.error ? (
                <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                  {fieldState.error.message}
                </AppText>
              ) : null}
            </Field>
          )}
        />
        {formError ? (
          <AppText variant="small" color={colors.destructive}>
            {formError}
          </AppText>
        ) : null}
        <Button icon={ArrowRight} disabled={submitting} onPress={handleSubmit(onSubmit)}>
          {submitting ? "Signing in..." : "Sign In"}
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
