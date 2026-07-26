---
target: apps/mobile role-driven dashboard (dashboard.tsx + widgets)
total_score: 27
p0_count: 2
p1_count: 2
timestamp: 2026-07-26T09-52-21Z
slug: p-dashboard-tsx-role-driven-dashboard-admin-cto-oo
---
# Critique: Role-Driven Dashboard (app/(app)/dashboard.tsx)

Method: dual-agent

## Design Health Score
27/40 — Acceptable

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | 4 of 8 widgets have no loading state |
| 2 | Match System / Real World | 4/4 | Plain, factual copy |
| 3 | User Control and Freedom | 3/4 | Undermined by duplicate dashboards |
| 4 | Consistency and Standards | 2/4 | Two diverging dashboard implementations |
| 5 | Error Prevention | 3/4 | Low-risk surface |
| 6 | Recognition Rather Than Recall | 3/4 | StatusBadge helps; 10 status colors is a lot |
| 7 | Flexibility and Efficiency | 2/4 | No filter/sort anywhere |
| 8 | Aesthetic and Minimalist Design | 3/4 | Admin stacks 6 widgets on one scroll |
| 9 | Error Recovery | 1/4 | 0 of 8 widgets handle isError |
| 10 | Help and Documentation | 3/4 | N/A for register |

## Priority Issues

[P0] Fabricated numbers presented as real data — StatsOverviewWidget.tsx:141 static revenue trend, dashboards/[role].tsx:340 hardcoded damage count=3. Fix: compute real values or remove. Command: /impeccable harden

[P0] No accessibility labels on any dashboard interaction — 0 of 8 booking-row Pressables have accessibilityLabel/Role. Fix: add role + composed label to every row. Command: /impeccable audit

[P1] Two dashboard implementations, actively diverging — dashboard.tsx widget system vs dashboards/[role].tsx, already disagree on data. Fix: pick widget system as canonical, delete/redirect the other. Command: /impeccable distill

[P1] No widget surfaces an error state; truncation is inconsistent and silent — 0 of 8 widgets handle isError; RecentBookingsWidget caps at 6 with no indicator. Fix: apply LoadingState/ErrorState/EmptyState consistently. Command: /impeccable harden

[P2] Unvirtualized booking lists despite existing FlashList wrapper — NativeList unused by any widget; 3 widgets raw .map() booking arrays. Fix: swap to NativeList. Command: /impeccable optimize

## Persona Red Flags

Alex (Power User): FeaturedBookingWidget's arbitrary fallback (BOOKINGS[4]) reads as broken; fake revenue trend erodes trust; no filter/sort lever.

Sam (Accessibility): unlabeled Pressables read as flattened text with no grouping; EquipmentPoolWidget.tsx:36 uses text3 (~3.2:1) below the size threshold DESIGN.md itself sets.

## Minor Observations

- Touch targets pinned to 44pt (iOS floor) but below Android's 48dp floor
- QuickActionsWidget.tsx:85 hand-types rgba instead of alpha() helper; permanent accent tint violates Signal Rule
- 2 of 8 widgets return null silently instead of using EmptyState
- Screen-type/status arrays duplicated verbatim between ScreenAvailabilityWidget and dashboards/[role].tsx
