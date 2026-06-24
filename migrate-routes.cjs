const fs = require('fs');
const path = require('path');

const config = [
  { route: 'staff.tsx', feat: 'users', destFile: 'UsersPage.tsx', comp: 'StaffPage', routePath: '/staff' },
  { route: 'bookings.$code.tsx', feat: 'bookings', destFile: 'BookingDetailPage.tsx', comp: 'BookingDetail', routePath: '/bookings/$code' },
  { route: 'notifications.tsx', feat: 'notifications', destFile: 'NotificationsPage.tsx', comp: 'NotificationsPage', routePath: '/notifications' },
  { route: 'dashboards.tsx', feat: 'dashboards', destFile: 'DashboardsLayout.tsx', comp: 'DashboardsLayout', routePath: '/dashboards' },
  { route: 'damage-report.tsx', feat: 'damage-reports', destFile: 'DamageReportPage.tsx', comp: 'DamageReportPage', routePath: '/damage-report' },
  { route: 'dashboards.oo.tsx', feat: 'dashboards', destFile: 'OoDashboardPage.tsx', comp: 'OoDashboard', routePath: '/dashboards/oo' },
  { route: 'inventory.index.tsx', feat: 'inventory', destFile: 'InventoryListPage.tsx', comp: 'InventoryPage', routePath: '/inventory/' },
  { route: 'bookings.tsx', feat: 'bookings', destFile: 'BookingsLayout.tsx', comp: 'BookingsLayout', routePath: '/bookings' },
  { route: 'bookings.index.tsx', feat: 'bookings', destFile: 'BookingsListPage.tsx', comp: 'BookingsIndex', routePath: '/bookings/' },
  { route: 'dashboards.index.tsx', feat: 'dashboards', destFile: 'DashboardsPortalPage.tsx', comp: 'DashboardsPortal', routePath: '/dashboards/' },
  { route: 'dashboards.ccr.tsx', feat: 'dashboards', destFile: 'CcrDashboardPage.tsx', comp: 'CcrDashboard', routePath: '/dashboards/ccr' },
  { route: 'inventory.$itemId.tsx', feat: 'inventory', destFile: 'InventoryDetailPage.tsx', comp: 'InventoryDetail', routePath: '/inventory/$itemId' },
  { route: 'bookings.new.tsx', feat: 'bookings', destFile: 'NewBookingPage.tsx', comp: 'NewBooking', routePath: '/bookings/new' },
  { route: 'inventory.tsx', feat: 'inventory', destFile: 'InventoryLayout.tsx', comp: 'InventoryLayout', routePath: '/inventory' },
  { route: 'reports.tsx', feat: 'reports', destFile: 'ReportsPage.tsx', comp: 'ReportsPage', routePath: '/reports' },
  { route: 'dashboards.to.tsx', feat: 'dashboards', destFile: 'ToDashboardPage.tsx', comp: 'ToDashboard', routePath: '/dashboards/to' },
  { route: 'dashboards.sk.tsx', feat: 'dashboards', destFile: 'SkDashboardPage.tsx', comp: 'SkDashboard', routePath: '/dashboards/sk' },
  { route: 'checkout.tsx', feat: 'checkout', destFile: 'CheckoutPage.tsx', comp: 'CheckoutPage', routePath: '/checkout' },
  { route: 'dashboards.cto.tsx', feat: 'dashboards', destFile: 'CtoDashboardPage.tsx', comp: 'CtoDashboard', routePath: '/dashboards/cto' },
  { route: 'index.tsx', feat: 'dashboards', destFile: 'AdminDashboardPage.tsx', comp: 'AdminDashboard', routePath: '/' },
  { route: 'settings.tsx', feat: 'settings', destFile: 'SettingsPage.tsx', comp: 'SettingsPage', routePath: '/settings' }
];

config.forEach(({ route, feat, destFile, comp, routePath }) => {
  const srcRoutePath = path.join(__dirname, 'src/routes', route);
  const destDirPath = path.join(__dirname, 'src/features', feat, 'pages');
  const destFilePath = path.join(destDirPath, destFile);

  if (!fs.existsSync(srcRoutePath)) return;

  // Make sure dest dir exists
  if (!fs.existsSync(destDirPath)) {
    fs.mkdirSync(destDirPath, { recursive: true });
  }

  // 1. Read source
  let content = fs.readFileSync(srcRoutePath, 'utf8');

  // Remove the `export const Route = ...` block completely to avoid duplicates.
  // A simple regex to remove the createFileRoute block. It usually ends with `});` or similar.
  // Actually, we can just replace `export const Route = createFileRoute` with `const _Route = createFileRoute`
  // and we also need to make sure the component is exported.
  
  // Replace `function CompName` with `export function CompName`
  const funcRegex = new RegExp(`function\\s+${comp}\\s*\\(`, 'g');
  if (content.match(funcRegex)) {
    content = content.replace(funcRegex, `export function ${comp}(`);
  } else {
    // maybe it's an arrow function
    const constRegex = new RegExp(`const\\s+${comp}\\s*=`, 'g');
    content = content.replace(constRegex, `export const ${comp} =`);
  }

  // Disable the Route export
  content = content.replace(/export const Route/g, 'const _Route');

  // Write the feature page file
  fs.writeFileSync(destFilePath, content, 'utf8');
  console.log(`Created ${destFilePath}`);

  // 2. Rewrite the route file
  const routeContent = `import { createFileRoute } from "@tanstack/react-router";\nimport { ${comp} } from "@/features/${feat}/pages/${destFile.replace('.tsx', '')}";\n\nexport const Route = createFileRoute("${routePath}")({\n  component: ${comp}\n});\n`;
  fs.writeFileSync(srcRoutePath, routeContent, 'utf8');
  console.log(`Rewrote route ${srcRoutePath}`);
});
