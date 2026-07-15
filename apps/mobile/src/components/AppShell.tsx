import { Slot, router, usePathname } from "expo-router";
import { to } from "@/utils/routes";
import {
  BarChart3,
  Bell,
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";
import { alpha, colors, radius } from "@/theme/tokens";
import { AppText, BrandMark, Button, IconButton } from "@/components/ui";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarRange },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/checkout", label: "Check-in / out", icon: ClipboardCheck },
] as const;

const SECONDARY_NAV = [
  { href: "/damage-report", label: "Damage reports", icon: ShieldAlert },
  { href: "/staff", label: "Staff", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const ROLE_LINKS = [
  { href: "/dashboards/ccr", label: "Client Relations (CCR)" },
  { href: "/dashboards/cto", label: "Chief Technician (CTO)" },
  { href: "/dashboards/to", label: "Technician (TO)" },
  { href: "/dashboards/oo", label: "Operations (OO)" },
  { href: "/dashboards/sk", label: "Storekeeper (SK)" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    "/dashboard",
    "/bookings",
    "/inventory",
    "/checkout",
    "/damage-report",
    "/staff",
    "/reports",
    "/notifications",
    "/settings",
  ],
  CCR: ["/dashboard", "/bookings", "/reports", "/notifications", "/settings"],
  CTO: ["/dashboard", "/bookings", "/staff", "/notifications", "/settings"],
  TO: ["/dashboard", "/bookings", "/checkout", "/notifications"],
  OO: ["/dashboard", "/bookings", "/checkout", "/staff", "/reports", "/notifications"],
  SK: ["/dashboard", "/checkout", "/damage-report", "/inventory", "/notifications"],
};

const ROLE_WORKSPACE_PATHS = {
  CCR: "/dashboards/ccr",
  CTO: "/dashboards/cto",
  TO: "/dashboards/to",
  OO: "/dashboards/oo",
  SK: "/dashboards/sk",
} as const;

function titleFromPath(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/bookings/new")) return "New Booking";
  if (pathname.startsWith("/bookings/")) return "Booking Detail";
  if (pathname === "/bookings") return "Bookings";
  if (pathname.startsWith("/inventory/")) return "Inventory Detail";
  if (pathname === "/inventory") return "Inventory";
  if (pathname === "/checkout") return "Check-in / out";
  if (pathname === "/damage-report") return "Damage reports";
  if (pathname === "/staff") return "Staff";
  if (pathname === "/reports") return "Reports";
  if (pathname === "/notifications") return "Notifications";
  if (pathname === "/settings") return "Settings";
  if (pathname.startsWith("/dashboards")) return "Role Workspaces";
  return "Vortex Visual";
}

function canOpen(role: string, href: string) {
  return ROLE_PERMISSIONS[role]?.some((path) => href === path || href.startsWith(`${path}/`));
}

export function AppShell() {
  const pathname = usePathname();
  const { activeProfile, profiles, setActiveProfile, theme, toggleTheme, logout } = useAppContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navTitle = titleFromPath(pathname);
  const unreadHint = true;
  const visibleSecondary = useMemo(
    () => SECONDARY_NAV.filter((item) => canOpen(activeProfile.role, item.href)),
    [activeProfile.role],
  );

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <IconButton icon={Menu} label="Open navigation" onPress={() => setDrawerOpen(true)} />
          <View style={styles.headerTitle}>
            <AppText variant="eyebrow">{activeProfile.role} workspace</AppText>
            <AppText style={styles.titleText} numberOfLines={1}>
              {navTitle}
            </AppText>
          </View>
          <IconButton icon={Search} label="Search" onPress={() => setSearchOpen(true)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push(to("/notifications"))}
            style={styles.headerIcon}
          >
            <Bell size={18} color={colors.text2} />
            {unreadHint ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <Slot />
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
        <View style={styles.bottomNav}>
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </View>
      </SafeAreaView>

      <Modal
        visible={drawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerWrap}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <SafeAreaView style={styles.drawer} edges={["top", "bottom"]}>
            <View style={styles.drawerHeader}>
              <BrandMark />
              <IconButton icon={X} label="Close navigation" onPress={() => setDrawerOpen(false)} />
            </View>

            <Pressable style={styles.profileCard} onPress={() => setProfileOpen(true)}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText} color={colors.accentForeground}>
                  {activeProfile.initials}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: "800" }}>{activeProfile.name}</AppText>
                <AppText variant="small" color={colors.text3}>
                  {activeProfile.role}
                </AppText>
              </View>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerBody}
            >
              <DrawerGroup title="Navigation">
                {[...PRIMARY_NAV, ...visibleSecondary].map((item) => (
                  <DrawerLink
                    key={item.href}
                    item={item}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    onClose={() => setDrawerOpen(false)}
                  />
                ))}
              </DrawerGroup>

              <DrawerGroup
                title={activeProfile.role === "Admin" ? "Role Workspaces" : "My Workspace"}
              >
                {activeProfile.role === "Admin" ? (
                  ROLE_LINKS.map((item) => (
                    <Pressable
                      key={item.href}
                      onPress={() => {
                        setDrawerOpen(false);
                        router.push(to(item.href));
                      }}
                      style={[
                        styles.roleLink,
                        pathname === item.href ? styles.roleLinkActive : null,
                      ]}
                    >
                      <AppText
                        variant="small"
                        color={pathname === item.href ? colors.foreground : colors.text2}
                        style={{ fontWeight: "700" }}
                      >
                        {item.label}
                      </AppText>
                    </Pressable>
                  ))
                ) : (
                  <Pressable
                    onPress={() => {
                      setDrawerOpen(false);
                      router.push(
                        to(
                          ROLE_WORKSPACE_PATHS[
                            activeProfile.role as keyof typeof ROLE_WORKSPACE_PATHS
                          ],
                        ),
                      );
                    }}
                    style={styles.roleLink}
                  >
                    <AppText variant="small" style={{ fontWeight: "700" }}>
                      Open {activeProfile.role} Workspace
                    </AppText>
                  </Pressable>
                )}
              </DrawerGroup>
            </ScrollView>

            <View style={styles.drawerFooter}>
              <Button variant="outline" icon={theme === "dark" ? Sun : Moon} onPress={toggleTheme}>
                Toggle theme
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  logout();
                  router.replace(to("/login"));
                }}
              >
                Sign out
              </Button>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={profileOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileOpen(false)} />
        <View style={styles.profileSheet}>
          <View style={styles.sheetHandle} />
          <AppText style={styles.sheetTitle}>Control Workspaces</AppText>
          {profiles.map((profile) => {
            const active = profile.role === activeProfile.role;
            return (
              <Pressable
                key={profile.role}
                onPress={() => {
                  setActiveProfile(profile);
                  setProfileOpen(false);
                }}
                style={[styles.profileOption, active ? styles.profileOptionActive : null]}
              >
                <View style={[styles.avatar, active ? styles.avatarActive : null]}>
                  <AppText
                    style={styles.avatarText}
                    color={active ? colors.accentForeground : colors.foreground}
                  >
                    {profile.initials}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    color={active ? colors.accent : colors.foreground}
                    style={{ fontWeight: "800" }}
                  >
                    {profile.name}
                  </AppText>
                  <AppText variant="small" color={colors.text3}>
                    {profile.description}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Modal>

      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchOpen(false)}
      >
        <SafeAreaView style={styles.searchOverlay}>
          <View style={styles.searchPanel}>
            <View style={styles.searchInputWrap}>
              <Search size={18} color={colors.text3} />
              <TextInput
                autoFocus
                placeholder="Search bookings, clients, codes..."
                placeholderTextColor={colors.text3}
                selectionColor={colors.accent}
                style={styles.searchInput}
              />
            </View>
            <Button variant="ghost" onPress={() => setSearchOpen(false)}>
              Cancel
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(to(href))}
      style={styles.navItem}
    >
      <Icon size={20} color={active ? colors.accent : colors.text3} />
      <AppText
        variant="small"
        color={active ? colors.foreground : colors.text3}
        style={styles.navLabel}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function DrawerGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.drawerGroup}>
      <AppText variant="eyebrow">{title}</AppText>
      <View style={{ gap: 4 }}>{children}</View>
    </View>
  );
}

function DrawerLink({
  item,
  active,
  onClose,
}: {
  item: { href: string; label: string; icon: LucideIcon };
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={() => {
        onClose();
        router.push(to(item.href));
      }}
      style={[styles.drawerLink, active ? styles.drawerLinkActive : null]}
    >
      <Icon size={17} color={active ? colors.accent : colors.text2} />
      <AppText color={active ? colors.foreground : colors.text2} style={{ fontWeight: "700" }}>
        {item.label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafe: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  content: {
    flex: 1,
  },
  bottomSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bottomNav: {
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  drawerWrap: {
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    width: "84%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerHeader: {
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileCard: {
    margin: 12,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "900",
  },
  drawerBody: {
    padding: 12,
    gap: 18,
  },
  drawerGroup: {
    gap: 8,
  },
  drawerLink: {
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerLinkActive: {
    backgroundColor: colors.surface2,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  roleLink: {
    minHeight: 40,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  roleLinkActive: {
    backgroundColor: colors.surface2,
    borderLeftColor: colors.accent,
  },
  drawerFooter: {
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  profileSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 10,
  },
  profileOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface2,
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: alpha(colors.background, 0.96),
  },
  searchPanel: {
    padding: 16,
    gap: 12,
  },
  searchInputWrap: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
  },
});
