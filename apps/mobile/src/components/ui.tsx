import { FlashList, type FlashListProps } from "@shopify/flash-list";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Calendar, Clock3, PhoneCall, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
import brandLogo from "../../assets/icon.png";
import { useDateFormatter } from "@/context/CalendarSystemContext";
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screenContentFlex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
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
      <Image
        accessibilityLabel="VORTEX logo"
        source={brandLogo}
        style={[styles.brandLogo, compact ? styles.brandLogoCompact : null]}
      />
      {!compact ? <AppText style={styles.brandName}>VORTEX</AppText> : null}
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
      style={styles.tabsScroll}
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

function formatDateValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeValue(date: Date): string {
  const base = formatDateValue(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${base}T${hh}:${mm}`;
}

function parseDateValue(value?: string, mode: "date" | "datetime" = "date"): Date | null {
  if (!value) return null;
  const normalized = mode === "datetime" ? value : `${value}T00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseTimeValue(value?: string): string {
  if (!value || !value.includes("T")) return "12:00";
  return value.split("T")[1]?.slice(0, 5) || "12:00";
}

function mergeDateAndTime(date: Date, timeValue: string): Date {
  const [hours, minutes] = timeValue.split(":").map((part) => Number(part) || 0);
  const merged = new Date(date);
  merged.setHours(hours, minutes, 0, 0);
  return merged;
}

export function DatePickerInput({
  value,
  onChangeText,
  mode = "date",
  placeholder,
  minimumDate,
  maximumDate,
}: {
  value?: string;
  onChangeText: (value: string) => void;
  mode?: "date" | "datetime";
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { formatDate, formatDateTime } = useDateFormatter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const parsed = parseDateValue(value, mode) ?? new Date();
  const timeValue = parseTimeValue(value);

  const handleDateChange = (event: DateTimePickerEvent, next?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (!next) return;
    const formatted =
      mode === "datetime"
        ? formatDateTimeValue(mergeDateAndTime(next, timeValue))
        : formatDateValue(next);
    onChangeText(formatted);
    setShowDatePicker(false);
  };

  const handleTimeChange = (event: DateTimePickerEvent, next?: Date) => {
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }
    if (!next) return;
    const formatted = formatDateTimeValue(next);
    onChangeText(formatted);
    setShowTimePicker(false);
  };

  const displayText = value
    ? mode === "datetime"
      ? formatDateTime(value)
      : formatDate(value)
    : placeholder || (mode === "datetime" ? "Select date & time" : "Select date");

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.dateMainRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={placeholder || "Select date"}
          onPress={() => setShowDatePicker(true)}
          style={({ pressed }) => [
            styles.dateInput,
            styles.dateInputGrow,
            pressed ? styles.pressed : null,
          ]}
        >
          <Calendar size={16} color={value ? colors.accent : colors.text3} />
          <AppText
            variant="data"
            color={value ? colors.foreground : colors.text3}
            style={{ flex: 1 }}
          >
            {displayText}
          </AppText>
        </Pressable>
      </View>

      {mode === "datetime" ? (
        <View style={styles.dateTimeTools}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adjust time"
            onPress={() => setShowTimePicker(true)}
            style={({ pressed }) => [styles.timeChip, pressed ? styles.pressed : null]}
          >
            <Clock3 size={14} color={colors.text2} />
            <AppText variant="small" color={colors.text2} style={{ fontWeight: "700" }}>
              {timeValue}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {showDatePicker ? (
        <DateTimePicker
          value={parsed}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleDateChange}
        />
      ) : null}

      {showTimePicker && mode === "datetime" ? (
        <DateTimePicker
          value={mergeDateAndTime(parsed, timeValue)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      ) : null}
    </View>
  );
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

export function KV({
  label,
  value,
  mono,
  phone,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  phone?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <AppText variant="eyebrow" style={styles.kvLabel}>
        {label}
      </AppText>
      {phone && typeof value === "string" && value ? (
        <PhoneLink number={value} />
      ) : (
        <AppText variant={mono ? "data" : "body"} style={styles.kvValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

/**
 * Tappable phone number that opens the native dialler.
 */
export function PhoneLink({ number, label }: { number: string; label?: string }) {
  const dial = () => {
    const url = `tel:${number.replace(/\s+/g, "")}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Not supported", "Your device cannot make phone calls.");
          return;
        }
        return Linking.openURL(url);
      })
      .catch(() => Alert.alert("Error", "Could not open the dialler."));
  };

  return (
    <Pressable
      onPress={dial}
      accessibilityRole="button"
      accessibilityLabel={`Call ${number}`}
      style={({ pressed }) => [styles.phoneLink, pressed && styles.phoneLinkPressed]}
    >
      <View style={styles.phoneIconWrap}>
        <PhoneCall size={12} color={colors.accentForeground} />
      </View>
      <AppText variant="data" style={styles.phoneLinkText}>
        {label || number}
      </AppText>
    </Pressable>
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
  ListHeaderComponent,
  ItemSeparatorComponent,
  extraData,
  contentContainerStyle,
}: Pick<
  FlashListProps<T>,
  | "data"
  | "renderItem"
  | "keyExtractor"
  | "ListEmptyComponent"
  | "ListHeaderComponent"
  | "ItemSeparatorComponent"
  | "extraData"
  | "contentContainerStyle"
>) {
  return (
    <FlashList
      style={{ flex: 1 }}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={extraData}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={ItemSeparatorComponent}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    />
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetKeyboardWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <AppText style={styles.sheetTitle}>{title}</AppText>
              <Button variant="ghost" onPress={onClose}>
                Close
              </Button>
            </View>
            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScrollContent}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
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
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
  },
  brandLogoCompact: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontSize: 13,
    fontFamily: typography.sansExtraBold,
    letterSpacing: 3,
    color: colors.foreground,
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
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
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
  dateInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  dateInputGrow: {
    flex: 1,
  },
  dateMainRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateTimeTools: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
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
  phoneLink: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    minHeight: 36,
    borderWidth: 1,
    borderColor: alpha(colors.accent, 0.5),
    backgroundColor: alpha(colors.accent, 0.14),
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  phoneLinkPressed: {
    opacity: 0.6,
  },
  phoneIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  phoneLinkText: {
    fontWeight: "900",
    color: colors.accent,
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
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalRoot: {
    flex: 1,
  },
  sheetKeyboardWrap: {
    position: "absolute",
    top: "18%",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "100%",
    flexShrink: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sheetScrollContent: {
    gap: 12,
  },
  sheetBody: {
    flexShrink: 1,
  },
  sheetFooter: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
