import { zodResolver } from "@hookform/resolvers/zod";
import { to } from "@/utils/routes";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardEvent,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AppText, BrandMark, Button, Field, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { alpha, colors, typography } from "@/theme/tokens";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}

export default function LoginScreen() {
  const { login, theme } = useAppContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const formOffsetRef = useRef(0);
  const focusedFieldRef = useRef<"email" | "password" | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });
  const isKeyboardOpen = isEditing || keyboardHeight > 0;

  const scrollFocusedFieldIntoView = () => {
    if (focusedFieldRef.current === "password") {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollRef.current?.scrollTo({
      y: Math.max(formOffsetRef.current - 8, 0),
      animated: true,
    });
  };

  useEffect(() => {
    if (keyboardHeight === 0) {
      setIsEditing(false);
      focusedFieldRef.current = null;
      return undefined;
    }

    const handle = setTimeout(scrollFocusedFieldIntoView, 50);
    return () => clearTimeout(handle);
  }, [keyboardHeight]);

  const revealFields = (field: "email" | "password") => {
    focusedFieldRef.current = field;
    setIsEditing(true);
    const delay = Platform.OS === "ios" ? 80 : 280;
    setTimeout(scrollFocusedFieldIntoView, delay);
  };

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

  const closedBottomPad = Math.max(insets.bottom, 16) + 12;
  const openBottomPad = Platform.OS === "ios" ? 24 : keyboardHeight + 16;

  return (
    <View style={styles.screen}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isKeyboardOpen ? openBottomPad : closedBottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!isKeyboardOpen) return;
          scrollFocusedFieldIntoView();
        }}
      >
        <View
          style={[
            styles.hero,
            isKeyboardOpen ? styles.heroCollapsed : null,
            { paddingTop: Math.max(insets.top, 16) + (isKeyboardOpen ? 8 : 16) },
          ]}
        >
          <LinearGradient
            colors={[alpha(colors.accent, 0.24), "transparent"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View entering={FadeIn.duration(500)}>
            <BrandMark compact={isKeyboardOpen} />
          </Animated.View>
          {isKeyboardOpen ? (
            <AppText variant="eyebrow" color={colors.accent}>
              Operations platform
            </AppText>
          ) : (
            <>
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
            </>
          )}
        </View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(180)}
          style={[styles.formPanel, isKeyboardOpen ? styles.formPanelCompact : null]}
          onLayout={(event) => {
            formOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          {isKeyboardOpen ? null : (
            <LockKeyhole size={26} color={colors.accent} strokeWidth={1.75} />
          )}
          <AppText variant="title" style={{ fontSize: isKeyboardOpen ? 20 : 22 }}>
            Sign in to operations
          </AppText>
          {isKeyboardOpen ? null : (
            <AppText variant="subtitle">Sign in with your email and password.</AppText>
          )}
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field label="Email Address">
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onFocus={() => revealFields("email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="your-email@example.com"
                  returnKeyType="next"
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
                    onFocus={() => revealFields("password")}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    style={styles.passwordInput}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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
          {isKeyboardOpen ? null : (
            <AppText variant="small" color={colors.text3} style={{ textAlign: "center" }}>
              Access is restricted to authorized Vortex Visual staff.
            </AppText>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 24,
    padding: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: "hidden",
    minHeight: 280,
  },
  heroCollapsed: {
    flexGrow: 0,
    justifyContent: "flex-start",
    gap: 8,
    paddingBottom: 16,
    minHeight: 0,
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
  formPanelCompact: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 16,
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
