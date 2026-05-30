# UI Language

Read this before building any UI component. It defines every visual and interaction decision.
All values come from `core/styles/tokens.css`. Never hardcode.

## Contents

- [Overall feel](#overall-feel)
- [What we never do](#what-we-never-do)
- [Colour usage](#colour-usage)
- [Typography](#typography)
- [Cards](#cards)
- [List rows](#list-rows)
- [Status pills](#status-pills)
- [Navigation](#navigation)
- [Page header](#page-header)
- [Sheets and overlays](#sheets-and-overlays)
- [Empty states](#empty-states)
- [Buttons](#buttons)
- [Swipe to delete / contextual swipe](#swipe-to-delete--contextual-swipe)
- [Long-press swipe — strong CTA](#long-press-swipe--strong-cta)
- [Tab filter / segmented control](#tab-filter--segmented-control)
- [Horizontal date scroller](#horizontal-date-scroller)
- [Section count badge](#section-count-badge)
- [Drag-to-complete button](#drag-to-complete-button)
- [Toast / snackbar](#toast--snackbar)
- [Charts](#charts)

---

## Overall Feel

**Warm, functional, and satisfying to use.** Data is the hero — the interface exists to surface it clearly, not to decorate around it. Interactions should feel physical and responsive: things move because you touched them, not because they are animating for the sake of it.

The grey reference app defines the visual tone: warm off-white backgrounds, clean cards, restrained use of colour for state only. The green reference app defines the interaction pattern: bottom navigation, status pills, sheet overlays, bold full-width CTAs.

---

## What We Never Do

- No gradients
- No drop shadows except `--shadow-card` on elevated surfaces
- No decorative illustrations except empty states
- No colour used for decoration — only for state (active, success, warning, danger)
- No hover-only interactions — every interaction must work on touch
- No text below `--font-size-caption` except badge labels
- No tap targets smaller than `--touch-target`
- No full reloads for navigation
- No skeleton screens — show real content or nothing

---

## Colour Usage

The background is always `--color-bg` (warm off-white). Cards sit on `--color-surface` (white). Never reverse this.

`--color-accent` is the only brand colour. Used for: active state on navigation, primary buttons, selected pills, progress indicators. Not used for: headings, body text, decorative elements.

Semantic colours (success, warning, danger) are used strictly for state. A green badge means active/good. An orange badge means pending/attention. A red badge means error/declined. Never use them for visual interest.

Dark surface (`--color-action-dark`) is reserved for strong CTAs only — end of match confirmation, destructive action confirmation, dismiss. Sparingly — one per screen maximum.

---

## Typography

Section headers: `--font-size-heading`, `--font-weight-bold`, `--color-text-primary`
List item titles: `--font-size-subheading`, `--font-weight-semibold`, `--color-text-primary`
Secondary / labels: `--font-size-caption`, `--font-weight-regular`, `--color-text-secondary`
Hero data values: `--font-size-display`, `--font-weight-bold`, `--color-text-primary`
Badge text: `--font-size-micro`, `--font-weight-semibold`

Never use more than three type sizes on one screen.

---

## Cards

The primary grouping unit. White surface on warm background, `--radius-md` corners, `--shadow-card`.

```css
background: var(--color-surface);
border-radius: var(--radius-md);
padding: var(--card-padding);
box-shadow: var(--shadow-card);
```

Cards group related content. Unrelated content gets separate cards. Never use a card just for visual interest — it must contain something.

Data cards (metric display): icon top-right, label top-left, large value bottom-left. Matches the "Time still available / 04:18" pattern from the reference.

---

## List Rows

Standard row: `--touch-target-lg` height minimum, `--space-md` horizontal padding.

Structure: `[icon 40px] [title + subtitle column flex-1] [action or value]`

- Icon: 40×40px, `--radius-full`, `--color-surface-raised` background
- Title: `--font-size-subheading`, `--font-weight-semibold`
- Subtitle: `--font-size-caption`, `--color-text-secondary`
- Trailing action: three-dot overflow menu OR status pill OR numeric value

Dividers between rows are `1px --color-border`, inset to align with the title (not full-width).

---

## Status Pills

Small rounded badges for state. Always `--radius-full`, `--font-size-micro`, `--font-weight-semibold`, `--space-1` vertical `--space-2` horizontal padding.

| State    | Background               | Text                    |
|----------|--------------------------|-------------------------|
| Active   | `--color-success-light`  | `--color-success`       |
| Pending  | `--color-warning-light`  | `--color-warning`       |
| Declined | `--color-danger-light`   | `--color-danger`        |
| Default  | `--color-accent-light`   | `--color-accent`        |

Never use colour alone to communicate state — always pair with a label.

---

## Navigation

Bottom navigation bar. Fixed, `--nav-height` tall, `--color-surface` background, `--shadow-sheet` top shadow. Padding bottom: `--safe-area-bottom`.

3–4 items. Each item: icon + label, `--touch-target-lg` tap area. Active item uses `--color-accent` for icon and label. Inactive uses `--color-text-muted`.

No badges on nav items except a numeric notification count (small dot, `--color-danger`, no border).

---

## Page Header

`--header-height` tall. Title centred, `--font-size-subheading`, `--font-weight-semibold`. Back arrow left. Optional action right (three-dot or labelled pill button). Padding top: `--safe-area-top`.

Home screen variant: large left-aligned greeting, `--font-size-title` + `--font-size-heading` stacked, with icon buttons top-right.

---

## Sheets and Overlays

Slide up from bottom. `--radius-xl` top corners. `--shadow-sheet`. White surface. Drag handle: 36×4px, `--color-border`, `--radius-full`, centred, `--space-2` from top.

Sheets are used for: contextual actions on a row, form input, confirmation dialogs. Not for navigation — navigation uses the router.

Backdrop: `rgba(0, 0, 0, 0.4)`, tap to dismiss.

---

## Empty States

Centred layout, vertically centred in available space.

Structure: `[illustration 120px] [title] [description] [optional CTA]`

- Illustration: simple line drawing or SVG, `--color-accent` or monochrome
- Title: `--font-size-heading`, `--font-weight-bold`, centred
- Description: `--font-size-body`, `--color-text-secondary`, centred, max 2 lines
- CTA: pill button if action available, otherwise no button

Empty state is not a loading state. Never show an empty state while data is loading.

---

## Buttons

**Primary pill button** — for additive actions (add, invite, create):
`--color-accent` background, white text, `--radius-full`, `--touch-target` height, `--space-6` horizontal padding, `--font-weight-semibold`.

**Dark full-width button** — for strong irreversible CTAs only (end match, confirm deletion):
`--color-action-dark` background, `--color-text-inverse` text, `--radius-lg`, `--touch-target-lg` height, full width. One per screen maximum.

**Ghost/outline button** — for secondary actions:
`--color-border` border, `--color-text-primary` text, `--color-surface` background, `--radius-full`.

No button uses a custom colour outside the token system.

---

## Swipe to Delete / Contextual Swipe

Swipe left on a list row to reveal a destructive action (delete, remove).
Reveal distance: 80px. Background: `--color-danger`. Icon: white trash/remove icon, centred in the revealed area.

The row slides left smoothly. At 80px the action is "armed" — a slight colour intensification signals this. Release past 80px triggers the action with a brief collapse animation. Release before 80px snaps back.

Never auto-trigger destructive actions. Always require intentional completion of the swipe.

---

## Long-Press Swipe — Strong CTA

For high-consequence actions (end of match, submit result): a hold-and-slide gesture on a full-width button.

The button shows a label ("Hold to end match") with a fill indicator that progresses as the user slides right. Completing the fill (100%) triggers the action. Releasing before completion resets. Haptic feedback at start and completion (`navigator.vibrate()`).

This replaces confirmation dialogs for the most common strong CTAs. It is intentional and physical — the user cannot accidentally trigger it.

---

## Tab Filter / Segmented Control

Pill-shaped tab row for filtering content (Upcoming / Completed / Cancelled). Container: `--color-surface-raised` background, `--radius-full`, `--space-1` padding. Active tab: white background (or `--color-action-dark` for high-contrast variant), `--shadow-card`, `--radius-full`. Text: `--font-size-caption`, `--font-weight-semibold`.

Used for: view filters, time range selectors (Week / Month / Year / All time). Never more than 4 tabs. If options exceed 4, use a dropdown instead.

---

## Horizontal Date Scroller

Horizontally scrollable row of date cells. Each cell: day-of-week label above, date number below, circular container. Selected cell: `--color-accent` or `--color-action-dark` filled circle, white text. Unselected: transparent, `--color-text-secondary` day label, `--color-text-primary` date. Dot indicator below cell if data exists for that date.

Cell size: 44×60px minimum. Row has `--space-md` horizontal padding, scrolls with `overflow-x: auto; scroll-snap-type: x mandatory`.

---

## Section Count Badge

Inline with section header text. Small filled circle, `--color-accent` background, white text, `--font-size-micro`. Sits immediately after the section title with `--space-2` gap. Used to show quantity at a glance without opening the section.

---

## Drag-to-Complete Button

The primary pattern for completing a strong action (mark done, submit score, confirm result). A full-width pill button with a sliding handle on the left.

- Container: `--color-accent` or `--color-action-dark` background, `--radius-full`, `--touch-target-lg` height
- Handle: white filled circle, chevron icon, sits left-padded `--space-1` inside the button
- Label: centred in the button, white text, `--font-weight-semibold`
- Interaction: user drags handle right; handle follows finger; button fill progresses behind it
- Completion: handle reaches right edge (within 8px threshold) → action fires → brief success animation
- Release before completion: handle springs back to start (`--ease-spring` transition)
- Haptic: `navigator.vibrate(10)` on drag start

This replaces confirmation dialogs for the most frequent strong CTAs. Label must describe the action clearly ("Drag to end match", "Drag to submit score").

---

## Toast / Snackbar

Temporary feedback after a completed action. Dark rounded pill, bottom of screen above navigation bar, `--space-md` margin, `--shadow-sheet`.

Structure: `[icon 20px] [title + description column] [optional undo text button]`

- Background: `--color-action-dark`, white text
- Icon: success (green check), error (red X), or info (accent dot)
- Title: `--font-size-body`, `--font-weight-semibold`
- Description: `--font-size-caption`, `--color-text-muted` (lighter on dark)
- Undo: `--color-accent` text, `--font-weight-semibold`, tappable

Auto-dismisses after 4 seconds. Tapping undo immediately reverses the action and dismisses. Only one toast visible at a time — new ones replace old ones. Slides up on enter, fades out on dismiss.

---

## Charts

**Line chart:** accent-coloured line (`--color-accent`), 2px stroke, no fill or very light tinted fill below. Axis labels `--font-size-micro`, `--color-text-muted`. Active point: filled circle with white centre, accent border. Reference line (target/threshold): dashed, `--color-text-muted`.

**Bar chart:** pill-shaped bars (`--radius-full` top, square bottom — or fully pill if floating). Light tinted fill (`--color-accent` at 20% opacity, or a neutral blue-grey). Active/highlighted bar uses stronger fill. Labels below bars: `--font-size-micro`, `--color-text-secondary`. Value labels above bars only when space allows.

Charts are built with SVG or Canvas — no charting library. Keep them simple: no tooltips on mobile (tap to highlight only), no animations beyond initial draw.

---

## Mixed Card Grid

Two-column layout where one tall narrow card sits beside a wider card. Used for hero metrics (a large percentage or score beside supporting detail). Both cards: `--color-surface`, `--radius-md`, `--shadow-card`. Tinted variant: light accent or neutral blue background for secondary card.

Only use this layout for dashboard-style summary views. Not for lists.

**Tap feedback:** brief scale-down (0.97) on touch, immediate. CSS only.
**Loading state:** a single animated dot or a subtle opacity pulse on the element being loaded. Never a spinner for inline content.
**Success state:** brief green flash on the affected element, then settle. No modal.
**Error state:** the affected element border turns `--color-danger`, an inline message below it. No modal for field errors.

---

## Animations (optional — `core/styles/animations.css`)

If the animations file is included, components may use these utility classes:

- `.enter-fade-up` — elements entering the viewport
- `.enter-slide-right` — page entering from the right (forward navigation)
- `.exit-slide-left` — page exiting to the left (forward navigation)
- `.sheet-enter` — bottom sheet sliding up
- `.tap-pulse` — brief scale feedback on interactive elements

All animations respect `prefers-reduced-motion`. If the user has reduced motion enabled, all transitions collapse to instant.

---

## Consistency Checklist (for `/review`)

Before any UI component is considered complete:

- [ ] All values from `tokens.css` — no hardcoded colours, spacing, or sizes
- [ ] Minimum `--touch-target` on every interactive element
- [ ] Works with `--safe-area-inset-*` on devices with home bar
- [ ] Empty state defined if the component can show no data
- [ ] No hover-only interaction — works on touch
- [ ] Colour not the only indicator of state — label always present
- [ ] Dark full-width button used at most once on any screen

---

[← Accessibility](../docs/a11y.md)
