# App header

The app-header module (`modules/app-header/app-header.js`) is a `<app-header>` custom element: a sticky header bar with a title and a named slot for trailing actions. It automatically shifts below the update banner when one is showing, and pads for the safe area on notched devices.

## Contents

- [Quick start](#quick-start)
- [Update banner integration](#update-banner-integration)
- [Safe area](#safe-area)
- [API reference](#api-reference)

---

## Quick start

```html
<app-header label="YourYear">
  <button slot="action" aria-label="Menu">☰</button>
</app-header>
```

The `label` attribute becomes the header's `<h1>` text. Anything slotted with `slot="action"` renders trailing, aligned to the end of the header (a menu button, a settings icon, whatever the page needs).

**`label` is read once, at mount.** `app-header` has no reactive update for it — if your page's title can change after the header is first rendered (switching years, switching records), read the current value fresh each time you create the element, or set it via a targeted DOM update in your own page component rather than relying on the attribute alone.

---

## Update banner integration

`app-header` is sticky (`position: sticky`) and reads `--update-banner-height` (set by `<update-banner>`, see [SW update flow](sw-update-flow.md)) for both its sticky threshold and its flow position:

```css
:host {
  position: sticky;
  inset-block-start: var(--update-banner-height, 0px);  /* sticky threshold */
  margin-block-start: var(--update-banner-height, 0px); /* flow position */
}
```

Both default to `0px` when no banner is present — zero cost when the update banner isn't showing. No wiring required on your side; mount `<app-header>` anywhere below `<update-banner>` in the DOM and it just works.

---

## Safe area

`app-header` pads its own top edge for the device safe area (`padding-block-start: var(--safe-area-top, 0px)`), so it never sits under a notch or dynamic island. This is additive to the update-banner offset above, not a replacement for it.

---

## API reference

### `<app-header>`

**Attributes**
- `label` {string} — the header's title text. Read once at mount (see [above](#quick-start)).

**Slots**
- `action` — trailing content, end-aligned (buttons, icons). Unslotted, the action area is empty and takes no space.

---

[← Reorder](reorder.md) · [Docs home](../README.md#docs) · [Next: Toast →](toast.md)
