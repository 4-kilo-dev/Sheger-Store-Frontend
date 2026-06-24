const fs = require('fs');
const path = require('path');

const fixes = [
  { file: 'src/features/bookings/pages/BookingDetailPage.tsx', old: 'function BookingDetailPage(', new: 'export function BookingDetail(' },
  { file: 'src/features/dashboards/pages/AdminDashboardPage.tsx', old: 'function AdminDashboard()', new: 'export function AdminDashboard()' },
  { file: 'src/features/dashboards/pages/DashboardsPortalPage.tsx', old: 'function DashboardsPortal()', new: 'export function DashboardsPortal()' },
  { file: 'src/features/dashboards/pages/ToDashboardPage.tsx', old: 'function ToDashboard()', new: 'export function ToDashboard()' },
  { file: 'src/features/dashboards/pages/DashboardsLayout.tsx', old: 'const _Route = createFileRoute("/dashboards")({\n  component: () => <Outlet />,\n});', new: 'export const DashboardsLayout = () => <Outlet />;' },
  { file: 'src/features/bookings/pages/BookingsLayout.tsx', old: 'const _Route = createFileRoute("/bookings")({\n  component: () => <Outlet />,\n});', new: 'export const BookingsLayout = () => <Outlet />;' },
  { file: 'src/features/bookings/pages/BookingsListPage.tsx', old: 'function BookingsIndex()', new: 'export function BookingsIndex()' },
  { file: 'src/features/inventory/pages/InventoryLayout.tsx', old: 'const _Route = createFileRoute("/inventory")({\n  component: () => <Outlet />,\n});', new: 'export const InventoryLayout = () => <Outlet />;' },
  { file: 'src/features/inventory/pages/InventoryListPage.tsx', old: 'function InventoryPage()', new: 'export function InventoryPage()' },
  { file: 'src/features/dashboards/pages/CcrDashboardPage.tsx', old: 'function CcrDashboard()', new: 'export function CcrDashboard()' },
  { file: 'src/features/inventory/pages/InventoryDetailPage.tsx', old: 'function InventoryDetail()', new: 'export function InventoryDetail()' },
  { file: 'src/features/bookings/pages/NewBookingPage.tsx', old: 'function NewBooking()', new: 'export function NewBooking()' },
  { file: 'src/features/dashboards/pages/SkDashboardPage.tsx', old: 'function SkDashboard()', new: 'export function SkDashboard()' },
  { file: 'src/features/checkout/pages/CheckoutPage.tsx', old: 'function CheckoutPage()', new: 'export function CheckoutPage()' },
  { file: 'src/features/dashboards/pages/CtoDashboardPage.tsx', old: 'function CtoDashboard()', new: 'export function CtoDashboard()' },
  { file: 'src/features/settings/pages/SettingsPage.tsx', old: 'function SettingsPage()', new: 'export function SettingsPage()' },
  { file: 'src/features/reports/pages/ReportsPage.tsx', old: 'function ReportsPage()', new: 'export function ReportsPage()' },
  { file: 'src/features/damage-reports/pages/DamageReportPage.tsx', old: 'function DamageReportPage()', new: 'export function DamageReportPage()' },
  { file: 'src/features/dashboards/pages/OoDashboardPage.tsx', old: 'function OoDashboard()', new: 'export function OoDashboard()' },
  { file: 'src/features/notifications/pages/NotificationsPage.tsx', old: 'function NotificationsPage()', new: 'export function NotificationsPage()' }
];

fixes.forEach(fix => {
  const p = path.join(__dirname, fix.file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // replace exact string if possible, else use regex for functions
    if (content.includes(fix.old)) {
      content = content.replace(fix.old, fix.new);
    } else {
      const cleanOld = fix.old.replace('function ', '').replace('()', '').replace('(', '');
      const regex = new RegExp(`function\\s+${cleanOld}\\s*\\(`, 'g');
      content = content.replace(regex, fix.new.replace('(', '') + '(');
    }
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', fix.file);
  }
});
