const fs = require('fs');
const path = require('path');

const fixes = [
  { file: 'src/features/bookings/pages/BookingDetailPage.tsx', old: 'component: BookingDetailPage', new: 'component: BookingDetail' },
  { file: 'src/features/dashboards/pages/AdminDashboardPage.tsx', old: 'component: Home', new: 'component: AdminDashboard' },
  { file: 'src/features/dashboards/pages/DashboardsPortalPage.tsx', old: 'component: DashboardsPortalPage', new: 'component: DashboardsPortal' },
  { file: 'src/features/dashboards/pages/ToDashboardPage.tsx', old: 'component: TODashboardPage', new: 'component: ToDashboard' },
  { file: 'src/features/dashboards/pages/OoDashboardPage.tsx', old: 'component: OODashboardPage', new: 'component: OoDashboard' },
  { file: 'src/features/dashboards/pages/SkDashboardPage.tsx', old: 'component: SKDashboardPage', new: 'component: SkDashboard' },
  { file: 'src/features/dashboards/pages/CcrDashboardPage.tsx', old: 'component: CCRDashboardPage', new: 'component: CcrDashboard' },
  { file: 'src/features/dashboards/pages/CtoDashboardPage.tsx', old: 'component: CTODashboardPage', new: 'component: CtoDashboard' },
  { file: 'src/features/bookings/pages/BookingsListPage.tsx', old: 'component: BookingsPage', new: 'component: BookingsIndex' },
  { file: 'src/features/inventory/pages/InventoryListPage.tsx', old: 'component: InventoryPage', new: 'component: InventoryPage' },
  { file: 'src/features/inventory/pages/InventoryDetailPage.tsx', old: 'component: InventoryDetailPage', new: 'component: InventoryDetail' },
  { file: 'src/features/checkout/pages/CheckoutPage.tsx', old: 'component: CheckoutPage', new: 'component: CheckoutPage' },
  { file: 'src/features/bookings/pages/NewBookingPage.tsx', old: 'component: NewBookingPage', new: 'component: NewBooking' },
  { file: 'src/features/settings/pages/SettingsPage.tsx', old: 'component: SettingsPage', new: 'component: SettingsPage' },
  { file: 'src/features/reports/pages/ReportsPage.tsx', old: 'component: ReportsPage', new: 'component: ReportsPage' },
  { file: 'src/features/damage-reports/pages/DamageReportPage.tsx', old: 'component: DamageReportPage', new: 'component: DamageReportPage' },
  { file: 'src/features/notifications/pages/NotificationsPage.tsx', old: 'component: NotificationsPage', new: 'component: NotificationsPage' },
  { file: 'src/features/users/pages/UsersPage.tsx', old: 'component: StaffPage', new: 'component: StaffPage' }, // Wait, userspage
];

fixes.forEach(fix => {
  const p = path.join(__dirname, fix.file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes(fix.old)) {
      content = content.replace(fix.old, fix.new);
      fs.writeFileSync(p, content, 'utf8');
      console.log('Fixed component reference in', fix.file);
    }
  }
});
