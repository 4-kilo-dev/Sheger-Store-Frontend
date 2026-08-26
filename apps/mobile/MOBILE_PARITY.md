# Mobile parity map

This file is the checked-in source-level parity checklist for the Vortex mobile client. Mobile uses native navigation and controls where the job is the same but the interaction must fit a phone; the data contract, permissions, labels, and mutations should remain shared with web.

## Route coverage

| Web surface | Mobile surface | Status |
| --- | --- | --- |
| Dashboard | Dashboard / role dashboards | Covered |
| Bookings list, create, detail | Bookings list, create, detail | Covered; native layout |
| Operations board | Operations | Covered |
| Inventory list/detail | Inventory list/detail | Covered |
| Check-in / out | Check-in / out and booking action sheet | Covered |
| Damage report creation | Damage report creation | Covered |
| Damage report management | Damage reports | Covered: list, search, history, resolve, reject |
| Notifications inbox | Notifications | Covered: feed, unread counts, read state, SSE, device registration |
| Notification settings | Notification settings | Covered: event types and routing rules |
| Staff | Staff | Covered: create, edit, activate, freelancer, reset password, assign |
| Roles and permissions | Staff → Roles & permissions | Covered: create, delete, grant, revoke |
| Reports | Reports | Covered; native layout and shareable CSV |
| Driver trips | Driver trips | Covered |
| Settings/custom fields | Settings | Covered |
| OTP placeholder route | No mobile route | Web route is currently a static placeholder; add only when backend OTP endpoints are production-ready. |

## Permission contract

Mobile mirrors web permission keys and gates UI by effective permissions from `/api/auth/me`, not role labels. Privileged parity includes `booking.force_done`, `booking.delete`, `damage.resolve`, `inventory.override_availability`, `notification.manage`, and `role.manage`.

## Native adaptations

- Web tables become touch-safe lists and sheets.
- Browser downloads become OS share actions.
- Browser EventSource becomes the RN XHR SSE client.
- Web file upload becomes RN multipart upload through `/attachments/file-upload`.
- Native push token registration is present; background delivery still depends on the backend provider/outbox integration.

## Verification

Run from the repository root:

```sh
pnpm --filter @vortex/mobile typecheck
pnpm --filter @vortex/mobile lint
pnpm --filter @vortex/mobile build
```

All three checks must pass before claiming a mobile release is in line with the checked-out web client.
