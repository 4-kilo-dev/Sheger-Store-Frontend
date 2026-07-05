import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { z } from "zod";
import { AppText, BrandMark, Button, Field, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors, typography } from "@/theme/tokens";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login } = useAppContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await login(values.email, values.password);
      router.replace(to(result.mustChangePassword ? "/change-password" : "/dashboard"));
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
        <LinearGradient
          colors={[colors.accentDim + "3d", "transparent"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View entering={FadeIn.duration(500)}>
          <BrandMark />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(600).delay(120)}>
          <AppText variant="eyebrow" color={colors.accent}>
            Operations platform
          </AppText>
          <AppText variant="title" style={styles.heroTitle}>
            Every screen. Every crew.{"\n"}
            <AppText variant="title" style={[styles.heroTitle, styles.heroTitleItalic]}>
              One clear operation.
            </AppText>
          </AppText>
          <AppText variant="subtitle" style={{ marginTop: 14 }}>
            Coordinate bookings, warehouse movement, installations, and client delivery from a
            single control room.
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(500).delay(300)}>
          <AppText variant="small" color={colors.text3}>
            Internal access · Addis Ababa, Ethiopia
          </AppText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(180)} style={styles.formPanel}>
        <LockKeyhole size={26} color={colors.accent} strokeWidth={1.75} />
        <AppText variant="title" style={{ fontSize: 22 }}>
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
              <View style={styles.passwordRow}>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={10}
                  style={styles.passwordToggle}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={colors.accent} />
                  ) : (
                    <Eye size={16} color={colors.text3} />
                  )}
                </Pressable>
              </View>
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
      </Animated.View>
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
    overflow: "hidden",
  },
  heroTitle: {
    marginTop: 16,
    fontSize: 33,
    lineHeight: 39,
  },
  heroTitleItalic: {
    marginTop: 0,
    fontFamily: typography.displayItalic,
    color: colors.accent,
  },
  formPanel: {
    gap: 18,
    padding: 24,
    paddingBottom: 36,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    height: 44,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
