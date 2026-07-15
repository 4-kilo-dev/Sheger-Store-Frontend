import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
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
  const { changePassword } = useAppContext();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<ChangePasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (values: ChangePasswordForm) => {
    setSubmitting(true);
    try {
      await changePassword(values.password);
      router.replace(to("/dashboard"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Card style={styles.card}>
        <ShieldCheck size={28} color={colors.accent} />
        <AppText variant="eyebrow" color={colors.accent}>
          Secure your account
        </AppText>
        <AppText variant="title" style={{ fontSize: 24 }}>
          Change Password
        </AppText>
        <AppText variant="subtitle">
          Please change the temporary password provided by your administrator to something only you
          know.
        </AppText>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field label="New Password">
              <Input value={field.value} onChangeText={field.onChange} secureTextEntry />
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
              <Input value={field.value} onChangeText={field.onChange} secureTextEntry />
              {fieldState.error ? (
                <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                  {fieldState.error.message}
                </AppText>
              ) : null}
            </Field>
          )}
        />
        <Button icon={ArrowRight} disabled={submitting} onPress={handleSubmit(onSubmit)}>
          {submitting ? "Saving..." : "Save & Continue"}
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
});
