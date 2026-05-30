# Theming

## Contents

- [Token system](#token-system)
- [Available tokens](#available-tokens)
- [Animations](#animations)

---

## Token system

All visual values — colours, spacing, typography, radii, shadows — are defined as CSS custom properties in `_lib/core/styles/tokens.css`. No component ever hardcodes a value that has a token equivalent.

To retheme an app, override two variables in your own stylesheet:

```css
:root {
  --color-accent:       #2D6BE4;   /* primary brand colour */
  --color-accent-light: #EAF0FD;   /* tinted backgrounds, badges */
}
```

Everything that uses accent — buttons, highlights, active states — updates automatically.

## Available tokens

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F5F2EE` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-surface-raised` | `#EEEAE4` | Inset or secondary cards |
| `--color-border` | `#E4E0DA` | Dividers, input borders |
| `--color-text-primary` | `#1C1C1E` | Headings, primary data |
| `--color-text-secondary` | `#8A8A8E` | **Large text only** (18px+) — 2.85:1 contrast |
| `--color-text-muted` | `#AEAEB2` | **Decorative only** — 2.32:1 contrast, never actionable labels |
| `--color-text-inverse` | `#FFFFFF` | Text on dark surfaces |
| `--color-accent` | `#E8824A` | Override to retheme |
| `--color-accent-light` | `#FDF0E8` | Override to retheme |
| `--color-accent-dark` | `#C4622E` | Pressed states — derived, override if needed |

Semantic colours (`--color-success`, `--color-warning`, `--color-danger` and their `-light` variants) are always paired with a text label. Colour alone is never the only state indicator.

White text on `--color-accent` fails WCAG AA contrast. Use accent for icons and fills only, not text labels.

### Spacing

4px base grid. Use semantic aliases in components:

```css
padding: var(--space-md);    /* 16px */
gap:     var(--space-sm);    /*  8px */
margin-block-end: var(--space-lg);  /* 24px */
```

| Alias | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

### Touch targets

```css
min-block-size: var(--touch-target);     /* 40px — all interactive elements */
min-block-size: var(--touch-target-lg);  /* 52px — primary actions, nav items */
```

### Typography

```css
font-family:   var(--font-family);
font-size:     var(--font-size-body);      /* 16px */
font-weight:   var(--font-weight-medium);  /* 500 */
line-height:   var(--line-height-normal);  /* 1.5 */
```

## Animations

Import `_lib/core/styles/animations.css` only if your app uses motion. All animations respect `prefers-reduced-motion` — the file handles this globally.

```html
<link rel="stylesheet" href="/_lib/core/styles/animations.css" />
```

Apply animation classes directly to elements:

```js
// Page transition — add to the entering page element
el.classList.add('enter-slide-right');

// List items loading in
el.classList.add('enter-fade-up');

// Bottom sheet
sheet.classList.add('sheet-enter');
```

### Available classes

**Page transitions** (add/remove on navigation):
- `enter-slide-right` — new page enters from right (forward navigation)
- `exit-slide-left` — old page exits to left
- `enter-slide-left` — new page enters from left (back navigation)
- `exit-slide-right` — old page exits to right

**Element entrances**:
- `enter-fade-up` — fade up from 12px below (list items, cards)
- `stagger-children` — apply to parent; children stagger with `--i` index
- `enter-scale` — scale in from 94% (modals, cards appearing)

**Overlays**:
- `sheet-enter` / `sheet-exit` — bottom sheet slide up/down
- `backdrop-enter` / `backdrop-exit` — overlay fade

**Feedback**:
- `tap-feedback` — scale 0.97 on `:active`, tap highlight removed
- `success-flash` — brief green background flash on success

**Gesture patterns** (JS-driven via CSS custom properties):
- `drag-handle` — controlled by `--drag-x`
- `drag-fill` — progress fill, controlled by `--drag-progress`
- `swipe-row` — controlled by `--swipe-x`

### Duration and easing tokens

```css
transition: transform var(--duration-normal) var(--ease-out);
```

| Token | Value |
|---|---|
| `--duration-fast` | 120ms |
| `--duration-normal` | 220ms |
| `--duration-slow` | 380ms |
| `--duration-spring` | 480ms |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |

---

[← Claude Code](claude.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: Accessibility →](a11y.md)
