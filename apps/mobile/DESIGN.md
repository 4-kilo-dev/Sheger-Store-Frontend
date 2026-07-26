---
name: Vortex Visual Operations
description: Ops-desk mobile app for LED-screen rental jobs — one status chain from booking to return.
colors:
  background: "#111113"
  foreground: "#E8E8EC"
  surface: "#18181B"
  surface-2: "#222225"
  border: "#2C2C30"
  text-secondary: "#9898A4"
  text-tertiary: "#64646E"
  accent: "#F5B731"
  accent-foreground: "#171310"
  accent-dim: "#6B4F0E"
  destructive: "#E5484D"
  success: "#30A46C"
  status-reserved: "#E8A030"
  status-confirmed: "#46A758"
  status-assigned: "#A18072"
  status-accepted: "#3E93DE"
  status-preparation: "#E54666"
  status-onsite: "#8B8B97"
  status-completed: "#0091B2"
  status-done: "#30A46C"
  status-canceled: "#E5484D"
  status-partially-returned: "#E8A030"
  payment-paid: "#6E56CF"
  payment-advance: "#E8A030"
  payment-unpaid: "#E54666"
typography:
  display:
    fontFamily: "Fraunces_600SemiBold, Georgia, serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: "-0.2px"
  title:
    fontFamily: "DMSans_700Bold, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.18
  body:
    fontFamily: "DMSans_500Medium, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.46
  subtitle:
    fontFamily: "DMSans_400Regular, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.54
  small:
    fontFamily: "DMSans_400Regular, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
  eyebrow:
    fontFamily: "DMSans_800ExtraBold, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "1px"
  data:
    fontFamily: "Menlo, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  stat:
    fontFamily: "Menlo, ui-monospace, monospace"
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1.19
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  round: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  button-primary-disabled:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
  status-badge:
    textColor: "{colors.status-reserved}"
    rounded: "{rounded.md}"
    height: "24px"
    padding: "4px 8px"
---

# Design System: Vortex Visual Operations

## 1. Overview

**Creative North Star: "The Control Room"**

Vortex reads like a broadcast operations desk, not a consumer app: a near-black panel (`#111113`), one amber signal color, and a status vocabulary that has to survive being read at a glance, in a rush, under bad light. Everything is built to state a fact — a booking status, a payment state, a crew assignment — without decorating it. The interface stays out of the way of the job.

The system explicitly rejects enterprise-ERP dread (no dense grey forms, no cryptic field codes burying the one thing someone needs to confirm), consumer-app playfulness (no mascots, confetti, or gamified streaks — this is a crew with a deadline), and the generic SaaS dashboard (no gradient hero-metric tile, no identical icon-plus-heading card grid). Depth comes from tone and hairline borders, never shadow; motion is a state change, not a performance.

**Key Characteristics:**
- Near-black ground with a three-step tonal surface ramp, no shadows anywhere
- A single amber accent (`#F5B731`) that only ever means "this needs you"
- A ten-value status color system that must carry meaning through label + dot, never color alone
- Fraunces serif reserved for section titles only; DM Sans and Menlo carry everything else
- Flat, bordered surfaces; component vocabulary repeats identically across all six role workspaces

## 2. Colors

The palette is Restrained: one saturated accent against a near-black neutral ramp, with a wide, deliberately loud status-color set carved out as its own vocabulary because status *is* the product.

### Primary
- **Signal Amber** (`#F5B731`): the only accent in the system. Primary buttons, active nav state, current stepper position, focus indication, brand mark. Never used decoratively — if it's on screen, it is pointing at the one thing that needs attention right now.

### Neutral
- **Void** (`#111113`): app background, the base of the Control Room.
- **Panel** (`#18181B`): first surface layer — cards, headers, bottom nav, drawers.
- **Panel Raised** (`#222225`): second surface layer — inputs, avatars, anything sitting on top of a Panel.
- **Hairline** (`#2C2C30`): all borders and dividers. Always 1px or `StyleSheet.hairlineWidth`, never thicker.
- **Signal White** (`#E8E8EC`): primary text (`foreground`).
- **Instrument Grey** (`#9898A4`): secondary text (`text2`) — subtitles, labels, secondary values. Confirmed ≥4.5:1 against Void.
- **Deep Grey** (`#64646E`): tertiary text (`text3`) — eyebrows, hints, disabled-adjacent labels. Measures **~3.2:1 against Void — below the 4.5:1 AA floor for body text.** Reserve for text ≥18px/bold ≥14px (where 3:1 applies), or pair with an icon/weight that doesn't depend on the color alone. Do not drop new body or label copy into `text3` below that size threshold.

### Status vocabulary (semantic, not decorative)
Ten `BookingStatus` values and three `PaymentStatus` values, each with a dedicated hue rendered at 14–16% fill / 44–45% border alpha inside a bordered pill (see Components → Status Badge): Reserved `#E8A030`, Confirmed `#46A758`, Assigned `#A18072`, Accepted `#3E93DE`, Preparation `#E54666`, Onsite `#8B8B97`, Completed `#0091B2`, Done / Confirmed-adjacent `#30A46C`, Canceled `#E5484D`, Partially Returned `#E8A030`. Payment: Paid `#6E56CF`, Advance `#E8A030`, Unpaid `#E54666`.

### Named Rules
**The Signal Rule.** Amber means "this needs you" — selection, primary action, current step. It never decorates a static element; if amber is on screen, something is asking for input or marking where you are.

**The Color-Is-Never-Alone Rule.** No status may be communicated by hue alone. `StatusBadge` always pairs color with the status label text and a dot; `StatusStepper` pairs color with a checkmark or step number. Any new status-bearing element must carry the same redundancy — required for color-blind users and for glare-washed outdoor screens.

## 3. Typography

**Display Font:** Fraunces (Semibold 600, Semibold Italic, Medium 500, Medium Italic)
**Body Font:** DM Sans (Regular 400, Medium 500, Bold 700, ExtraBold 800)
**Data Font:** Menlo (monospace)

**Character:** A humanist serif against a geometric-leaning grotesque — Fraunces carries just section titles and screen headers, giving the app one moment of warmth per screen before DM Sans takes over for every working line of text. Menlo marks anything that is a literal reading: stat numbers, codes, IDs.

### Hierarchy
- **Display** (Fraunces 600, 25px / 31px line-height, -0.2px tracking): screen titles and section headers only. Never buttons, labels, or data.
- **Title** (DM Sans 800, 17px): sheet and modal headers (Control Workspaces, bottom-sheet titles).
- **Body** (DM Sans 500, 13px / 19px): default reading text, list content, field values.
- **Subtitle** (DM Sans 400, 13px / 20px): secondary descriptive text under a title.
- **Small** (DM Sans 400, 11px / 16px): captions, helper text, list metadata.
- **Eyebrow** (DM Sans 800, 10px, 1px tracking, uppercase): section kickers, field labels, badge text. Used structurally as a label prefix, not as a decorative section-opener.
- **Data** (Menlo, 12px): codes, IDs, monospaced values.
- **Stat** (Menlo 700, 27px): the one large number on a `StatCard`.

### Named Rules
**The One Serif Rule.** Fraunces appears exactly once per screen context: the screen or section title. Buttons, badges, data, and body copy are never set in Fraunces — a display font in a UI label is the fastest way to make an instrument feel like a brochure.

## 4. Elevation

Vortex is flat by design: there is no `box-shadow` or blur anywhere in the system. Depth is conveyed entirely through a three-step tonal surface ramp (Void → Panel → Panel Raised) and 1px hairline borders. This is a deliberate instrument-panel choice, not an oversight — shadows imply a lit, physical desk scene; Vortex is meant to read identically on a sunlit loading dock and in a blacked-out venue, where soft shadows wash out and borders don't.

### Named Rules
**The Flat-By-Default Rule.** Surfaces never lift. A new component signals "raised" by moving one step up the tonal ramp and adding a border, never by adding shadow. The only visual "elevation" in the app is the drawer and bottom-sheet backdrop dim (`rgba(0,0,0,0.55)`), which exists to focus attention on an overlay, not to simulate depth.

## 5. Components

Every interactive component repeats identically across all six role workspaces (Admin, CCR, CTO, TO, OO, Storekeeper) — same button, same badge, same card, everywhere. Consistency is the point; role differentiation happens in content and permissions, never in component style.

### Buttons
- **Shape:** `radius.md` (6px), 44px minimum height (glove-safe touch target), horizontal icon + label layout with 8px gap.
- **Primary:** Signal Amber fill, `accent-foreground` (`#171310`) text — the only button that inverts to a dark-on-amber pairing.
- **Outline:** Panel background, Hairline border, Signal White text. Default choice for secondary actions (Retry, Cancel navigation).
- **Ghost:** transparent background and border. Reserved for the lowest-emphasis action in a group (Close, Sign out).
- **Danger:** destructive red at 10% fill with a full red border and red text — never a solid red fill, so it reads as "caution" rather than alarm-red noise.
- **Success:** solid `#30A46C` fill, white text. Used sparingly for confirm-completion actions.
- **Pressed / Disabled:** pressed drops opacity to 0.72; disabled drops to 0.45. No color shift, no scale animation.

### Status Badge (signature component)
- **Style:** bordered pill, `radius.md`, 24px min height (32px in `large`), tone fill at 14–16% alpha, tone border at 44–45% alpha, a 6px tone dot, and the status label in Eyebrow type set in the tone color.
- **Rule:** every badge is the redundant color + dot + label triad from the Color-Is-Never-Alone Rule — never render a bare colored dot or a bare colored background as a status signal.

### Status Stepper (signature component)
- Horizontal chain of circles connected by hairline/tone lines; a filled tone circle with a checkmark marks completed steps, an outlined tone circle marks the current step, hairline-bordered circles mark future steps. The visual chain is the literal metaphor for "one chain" from PRODUCT.md's positioning — booking status is never shown as an isolated label elsewhere without this context.

### Cards / Containers
- **Corner Style:** `radius.lg` (8px) for cards, `radius.xl` (12px) for sheets and drawers.
- **Background:** Panel (`#18181B`).
- **Shadow Strategy:** none — see Elevation.
- **Border:** 1px Hairline on every card; there is no borderless card variant.
- **Internal Padding:** 14px section body, `spacing.lg` (16px) screen-level padding.

### Inputs / Fields
- **Style:** Panel Raised (`#222225`) background, 1px Hairline border, `radius.md`, 44px height, 13px body text.
- **Focus:** selection/cursor color is Signal Amber; no separate focus-ring treatment currently defined — flag for `/impeccable audit` if keyboard/focus-visible parity becomes a requirement.
- **Placeholder:** rendered in `text3` (Deep Grey) — this is the one placeholder-text usage in the system and it inherits the 3.2:1 contrast gap noted under Neutral colors; needs a pass toward `text2` or a dedicated placeholder token to clear the 4.5:1 floor.
- **Label:** Eyebrow-style label above the field, optionally paired with a 13px icon in `text3`.

### Navigation
- **Top bar:** Panel background, hairline bottom border, 60px min height. Leading menu icon button, centered title (Eyebrow role label + Display-adjacent screen title stacked), trailing search + notification icons with an amber unread dot.
- **Bottom nav:** Panel background, hairline top border, 64px min height, up to five primary destinations. Active state: amber icon + Signal White label; inactive: `text3` icon and label.
- **Drawer:** slide-in from left, 84% width (max 360px), Panel background with a right hairline border. Groups navigation under an Eyebrow section title; active links get a Panel Raised background — never the side-stripe-border pattern.

## 6. Do's and Don'ts

### Do:
- **Do** keep the accent to Signal Amber only. One accent, used only for primary action, selection, and current-state signals (the Signal Rule).
- **Do** pair every status color with a label and a dot or icon (the Color-Is-Never-Alone Rule) — required for the app's WCAG 2.2 AA commitment and for outdoor/color-blind legibility.
- **Do** keep every touch target at 44×44 minimum; this is a glove-and-daylight app, not a mouse-and-monitor one.
- **Do** hold body and label text at `foreground` or `text2`, reserving `text3` for large text or icon-paired hints only, per its measured ~3.2:1 contrast.
- **Do** build new depth with the tonal surface ramp (Void → Panel → Panel Raised) plus a hairline border, never a shadow.
- **Do** set section and screen titles in Fraunces once per screen; everything else in DM Sans or Menlo.

### Don't:
- **Don't** add a second accent color or let amber decorate a static, non-actionable element.
- **Don't** use `border-left`/`border-right` as a colored accent stripe on cards or list items — active drawer links use a full background tint (Panel Raised), not a stripe.
- **Don't** introduce card grids of identical icon+heading+text tiles or a gradient hero-metric stat block — named anti-references from PRODUCT.md (generic SaaS dashboard).
- **Don't** add mascots, confetti, streaks, or other gamified/playful motifs — named anti-reference (consumer-app playfulness).
- **Don't** build dense multi-field forms or cryptic field codes that bury the one thing a user needs to confirm — named anti-reference (enterprise-ERP dread).
- **Don't** add box-shadow, blur, or glass treatments anywhere; the system is flat by doctrine, not by omission.
- **Don't** set buttons, badges, or data values in Fraunces — display type in a UI label breaks the One Serif Rule.
- **Don't** drop new copy into `text3` below 18px/bold-14px without an icon or weight backing it up; it fails the 4.5:1 AA floor on its own.
