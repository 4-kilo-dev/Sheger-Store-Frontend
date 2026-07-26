# Product

## Register

product

## Platform

adaptive

## Users

Every one of Vortex's six roles — Admin, CCR, CTO, TO, OO, Storekeeper — works this app as a full peer to the web client, not a stripped-down companion. CCR and Admin schedule and approve from an office; CTO validates screen specs; OO dispatches crews and vehicles; TO and Storekeeper are on site or in the warehouse, checking equipment in and out, installing, and confirming setup. The mobile app has to hold up in both contexts at once: a desk under office light and a loading dock or venue floor under a deadline. No role is the "real" user and the rest an afterthought; each opens the app already mid-task and needs their next action, not a tour.

## Product Purpose

Vortex tracks an LED-screen rental job as one continuous chain — booking, crew assignment, bill-of-materials, vehicle, on-site install, and return — so nothing about a job has to be re-entered or re-explained between the office and the field. Success is booking-shaped: every job moves through its full status chain on schedule, with no missed assembly, no equipment that leaves and doesn't come back, and no surprise discovered at the venue instead of in the system.

## Positioning

Vortex carries the whole job as a single status chain — booking through crew, gear, vehicle, on-site, and return — so no one re-keys a job between systems or discovers a gap only when they're standing at the venue.

## Brand Personality

Precise, calm, unflinching. The app reads like an instrument, not a coworker: it states facts without decoration, stays legible when someone's stressed or the light is bad, and never leaves room to doubt what it's telling you. Copy is plain and declarative, confirmations are brief and certain, and nothing in the interface performs friendliness or urgency it hasn't earned.

## Anti-references

Not enterprise-ERP dread — no dense grey forms, cryptic field codes, or 40-field screens that bury the one thing someone needs to confirm. Not consumer-app playfulness — no mascots, confetti, streaks, or gamification; this is a crew with a deadline, not a habit loop. Not a generic SaaS dashboard — no stat-tile row with a gradient hero metric, no identical icon-plus-heading card grid; every screen earns its layout from the task it serves, not from a template.

## Design Principles

State the fact, not the feeling. Every screen leads with the current status and next action, not decoration around it. One chain, always visible: booking, crew, gear, vehicle, and site status should feel like one continuous record, never six disconnected screens the user has to reconcile by memory. Legible under duress: contrast, touch target, and label choices are made for direct sun, a dark venue, and gloved hands — not for a designer's well-lit monitor. Same component, same meaning, everywhere: a status pill, a button, an empty state means the same thing and looks the same way on every one of the six role workspaces. Never make color carry information alone, since a third of the interface's meaning (booking and payment status) currently lives in a ten-value color vocabulary that must survive color blindness and glare.

## Accessibility & Inclusion

WCAG 2.2 AA is the formal bar across the app: contrast, focus order, screen-reader labels, and reduced-motion alternatives are a stated commitment, not a follow-up pass. Outdoor and low-light legibility is treated as a hard constraint, not an enhancement — body and label text should sit meaningfully above the 4.5:1 floor rather than skating it, and the current light-grey-on-dark text tiers (`text2` `#9898A4`, `text3` `#64646E` in [tokens.ts](src/theme/tokens.ts)) need auditing against this bar. Touch targets stay at or above 44×44 for gloved use, with extra spacing around destructive actions (cancel booking, remove crew, report damage). The ten-value `BookingStatus` and three-value `PaymentStatus` color vocabularies must never be the only signal — pair every status color with a label, icon, or shape so meaning survives for color-blind users and in direct sun.
