import { FlashList, type FlashListProps } from "@shopify/flash-list";
import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { alpha, colors, radius, typography } from "@/theme/tokens";
import { to } from "@/utils/routes";

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const content = (
    <View style={[styles.screenContent, !scroll && styles.screenContentFlex]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function AppText({
  children,
  variant = "body",
  color = colors.foreground,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: "title" | "subtitle" | "body" | "small" | "eyebrow" | "data" | "stat";
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[textStyles[variant], { color }, style]}>
      {children}
    </Text>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandDiamond}>
        <View style={styles.brandDiamondInner} />
      </View>
      {!compact ? (
        <View>
          <AppText style={styles.brandName}>VORTEX</AppText>
          <AppText style={styles.brandSub} color={colors.accent}>
            VISUAL
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  icon?: LucideIcon;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const buttonStyle = buttonStyles[variant];
  const textColor =
    variant === "primary"
      ? colors.accentForeground
      : variant === "danger"
        ? colors.destructive
        : variant === "success"
          ? colors.white
          : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {Icon ? <Icon size={16} color={textColor} strokeWidth={2.4} /> : null}
      <AppText style={styles.buttonText} color={textColor}>
        {children}
      </AppText>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  label,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
    >
      <Icon size={18} color={colors.text2} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({
  title,
  aside,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  aside?: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {Icon ? <Icon size={15} color={colors.accent} /> : null}
          <AppText style={styles.sectionTitle}>{title}</AppText>
        </View>
        {action ?? (aside ? <AppText variant="eyebrow">{aside}</AppText> : null)}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = colors.accent,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon?: LucideIcon;
  tone?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={styles.rowBetween}>
        <AppText variant="eyebrow">{label}</AppText>
        {Icon ? <Icon size={17} color={tone} /> : null}
      </View>
      <AppText variant="stat" style={{ marginTop: 10 }}>
        {value}
      </AppText>
      {note ? (
        <AppText variant="small" color={colors.text2} style={{ marginTop: 4 }}>
          {note}
        </AppText>
      ) : null}
    </Card>
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      {tabs.map((tab) => {
        const active = value === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, active ? styles.tabActive : null]}
          >
            <AppText
              variant="small"
              color={active ? colors.foreground : colors.text2}
              style={styles.tabText}
            >
              {tab}
            </AppText>
            {active ? <View style={styles.tabLine} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        {Icon ? <Icon size={13} color={colors.text3} /> : null}
        <AppText variant="eyebrow">{label}</AppText>
      </View>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return placeholderSafeInput(props);
}

export function TextArea(props: TextInputProps) {
  return placeholderSafeInput({ ...props, multiline: true, textAlignVertical: "top" }, [
    styles.input,
    styles.textarea,
  ]);
}

function placeholderSafeInput(
  props: TextInputProps,
  baseStyle: TextInputProps["style"] = styles.input,
) {
  const { style: overrideStyle, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.text3}
      selectionColor={colors.accent}
      {...rest}
      style={[baseStyle, overrideStyle]}
    />
  );
}

export function KV({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <View style={styles.kv}>
      <AppText variant="eyebrow" style={styles.kvLabel}>
        {label}
      </AppText>
      <AppText variant={mono ? "data" : "body"} style={styles.kvValue}>
        {value}
      </AppText>
    </View>
  );
}

export function ProgressBar({ value, tone = colors.accent }: { value: number; tone?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: tone }]}
      />
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.empty}>
      <AppText style={{ fontWeight: "700" }}>{title}</AppText>
      {detail ? (
        <AppText variant="small" color={colors.text3} style={{ marginTop: 4, textAlign: "center" }}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.accent} />
      <AppText variant="small" color={colors.text3} style={{ marginTop: 8 }}>
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({
  title = "Something went wrong",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <AppText style={{ fontWeight: "700", color: colors.destructive }}>{title}</AppText>
      {detail ? (
        <AppText variant="small" color={colors.text3} style={{ marginTop: 4, textAlign: "center" }}>
          {detail}
        </AppText>
      ) : null}
      {onRetry ? (
        <Button variant="outline" onPress={onRetry} style={{ marginTop: 12 }}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

export function BackLink({ label = "Back", href }: { label?: string; href?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (href ? router.push(to(href)) : router.back())}
      style={styles.backLink}
    >
      <AppText variant="small" color={colors.text2} style={{ fontWeight: "700" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function NativeList<T>({
  data,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  contentContainerStyle,
}: Pick<
  FlashListProps<T>,
  "data" | "renderItem" | "keyExtractor" | "ListEmptyComponent" | "contentContainerStyle"
>) {
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <AppText style={styles.sheetTitle}>{title}</AppText>
          <Button variant="ghost" onPress={onClose}>
            Close
          </Button>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenContentFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandDiamond: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: colors.accent,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  brandDiamondInner: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderColor: colors.foreground,
  },
  brandName: {
    fontSize: 13,
    fontFamily: typography.sansExtraBold,
    letterSpacing: 3,
    color: colors.foreground,
  },
  brandSub: {
    fontSize: 9,
    fontFamily: typography.sansExtraBold,
    letterSpacing: 3,
  },
  button: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: typography.sansBold,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  section: {
    overflow: "hidden",
  },
  sectionHeader: {
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.sansBold,
  },
  sectionBody: {
    padding: 14,
    gap: 12,
  },
  statCard: {
    padding: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tabs: {
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: alpha(colors.accent, 0.03),
  },
  tabText: {
    fontWeight: "800",
  },
  tabLine: {
    position: "absolute",
    height: 2,
    left: 10,
    right: 10,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 13,
  },
  textarea: {
    minHeight: 104,
    paddingTop: 12,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 7,
  },
  kvLabel: {
    flex: 1,
  },
  kvValue: {
    flex: 1.3,
    textAlign: "right",
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.round,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.round,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  backLink: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
});

const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: alpha(colors.destructive, 0.1),
    borderColor: colors.destructive,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
});

const textStyles = StyleSheet.create({
  title: {
    color: colors.foreground,
    fontSize: 25,
    lineHeight: 31,
    fontFamily: typography.display,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.text2,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: typography.sans,
  },
  body: {
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.sansMedium,
  },
  small: {
    color: colors.text2,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: typography.sans,
  },
  eyebrow: {
    color: colors.text2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: typography.sansExtraBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  data: {
    color: colors.foreground,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.data,
  },
  stat: {
    color: colors.foreground,
    fontSize: 27,
    lineHeight: 32,
    fontFamily: typography.data,
    fontWeight: "700",
  },
});
