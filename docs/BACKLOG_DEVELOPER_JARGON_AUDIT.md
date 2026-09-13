# Backlog: Developer Jargon vs User-Facing Operations Terminology Audit

**Status**: Queued / In Progress  
**Objective**: Eliminate technical, internal, or infrastructure-specific developer jargon from end-user and administrator interfaces across Vortex Visual Operations. Replace with clear, functional operational terms that describe business effects.

---

## 1. Terms Identified & Translation Dictionary

| Developer / Technical Jargon | User / Admin Facing Replacement | Affected Area / Module | Status |
| :--- | :--- | :--- | :--- |
| `PostgreSQL database dump / schema` | `System database & operational records` | Recovery & Backups | Resolved in Recovery UI |
| `MinIO binary attachments bucket` | `Media files, documents & attachments` | Recovery & Backups | Resolved in Recovery UI |
| `OAuth 2.0 cloud sync` | `Secure cloud storage sync` | Settings & Recovery | Resolved in Recovery UI |
| `S3 / MinIO configuration offline` | `File storage service is temporarily unavailable` | Booking Attachments (`useFileUpload.ts`, `attachments.api.ts`) | **Backlog Task** |
| `.tar.gz archive` | `System backup archive` | Recovery Table & Details | Ongoing / Cosmetic |
| `Operational mutations / DB rollbacks` | `System modifications / Data restore` | Settings & System Governance | Resolved in Recovery UI |
| `MD5 Checksum integrity badge` | `Integrity Verification Code` | Recovery Archives Table | Audited |
| `Raw HTTP error codes (409, 503, 500)` | Actionable toast messages (e.g., "Another backup is currently in progress") | Systemwide API Clients | Monitored |

---

## 2. Platform Audit Checklist

- [x] **Disaster Recovery & Backups Panel**:
  - Replaced technical database terms (`PostgreSQL dump`, `MinIO bucket`) with clear operational summaries (`System Data & Storage`, `Media & Uploaded Files`).
  - Polished light mode contrast for high-severity warnings, countdown timers, and target archive cards.
- [ ] **Bookings & Attachment Uploads**:
  - Audit `useFileUpload.ts` and `attachments.api.ts` error handlers to remove references to `S3/MinIO` in client-facing error toasts.
  - Standardize error message: *"Uploaded file could not be saved. File storage service is temporarily unreachable. Please try again or contact support."*
- [ ] **Warehouse & Inventory Check-in/Check-out**:
  - Ensure QR code scanners and batch check-ins display operational asset labels instead of raw database UUIDs or internal schema keys.
- [ ] **Authentication & Access Errors**:
  - Verify that permission denials provide human-readable operational reasons (e.g., *"You do not have permission to restore system backups"*) rather than raw permission keys (`system.restore`).

---

## 3. Guiding UX Principle
> *"Administrators and staff need to know **what the system is doing**, **what will be affected**, and **what action is required** — not the underlying server daemon, database engine, or cloud storage protocol powering it."*
