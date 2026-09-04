import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AppText, Button, Card, Field, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors } from "@/theme/tokens";

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordScreen() {
  const { changePassword, theme } = useAppContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ChangePasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (values: ChangePasswordForm) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await changePassword(values.password);
      router.replace(to("/dashboard"));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Couldn't change your password. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const revealFields = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <ShieldCheck size={28} color={colors.accent} />
          <AppText variant="eyebrow" color={colors.accent}>
            Secure your account
          </AppText>
          <AppText variant="title" style={{ fontSize: 24 }}>
            Change Password
          </AppText>
          <AppText variant="subtitle">
            Please change the temporary password provided by your administrator to something only
            you know.
          </AppText>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Field label="New Password">
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onFocus={revealFields}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
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
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field label="Confirm New Password">
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onFocus={revealFields}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
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
            {submitting ? "Saving..." : "Save & Continue"}
          </Button>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    padding: 20,
    gap: 16,
  },
});
