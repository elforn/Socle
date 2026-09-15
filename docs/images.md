# Images

The images module (`modules/images/images.js`) exports one function, `compressImage()` — resizes and re-encodes a user-selected photo as a JPEG `Blob` before it's stored. Canvas-based, no dependency.

## Contents

- [Quick start](#quick-start)
- [Why compress before storing](#why-compress-before-storing)
- [Storing the result](#storing-the-result)
- [API reference](#api-reference)

---

## Quick start

```js
import { compressImage } from '../_lib/modules/images/images.js';

fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const blob = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
  // blob is a JPEG Blob, ready to attach — see "Storing the result" below
});
```

---

## Why compress before storing

Photos from a phone camera are routinely 3–10MB. IndexedDB has no hard per-origin limit in most browsers, but storing originals uncompressed makes exports, backups, and sync payloads (see [Sync](architecture.md)) unnecessarily large for a personal-project use case that never needs print-resolution images. `compressImage()` downscales to `maxWidth` (preserving aspect ratio) and re-encodes as JPEG at `quality`.

**It never upscales.** A 600px-wide image with `maxWidth: 1200` passes through at its original size — `compressImage` only ever shrinks, never enlarges.

---

## Storing the result

The returned `Blob` is binary data — it does not belong in the event log (see [Architecture](architecture.md)). Use the store's blob methods, keyed by an id you generate:

```js
import * as Store from '../_lib/core/store/store.js';

const imageId = crypto.randomUUID();
const blob = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
await Store.attachBlob(imageId, blob);
await Store.dispatch('year:image-set', { year, imageId }); // event references the id, not the blob

// later, to display it:
const stored = await Store.getBlob(imageId);
const url = URL.createObjectURL(stored);
imgEl.src = url;
// ...and eventually: URL.revokeObjectURL(url);

// replacing or removing an image:
await Store.deleteBlob(oldImageId);
```

`Store.getAllBlobs()` (used by the [sync module](architecture.md)) includes every attached blob in a full export automatically — no extra wiring needed once you're using `attachBlob`.

---

## API reference

### `compressImage(file, options?)`

Resizes and re-encodes an image file as a JPEG `Blob`.

**Parameters**
- `file` {File | Blob} — the source image, typically from a file `<input>`
- `options` {object} — optional
  - `maxWidth` {number} — maximum width in pixels; default `1200`. Aspect ratio is preserved. Never upscales.
  - `quality` {number} — JPEG quality, `0`–`1`; default `0.8`

**Returns** `Promise<Blob>` — a `'image/jpeg'` blob at the resized dimensions

**Example**
```js
const blob = await compressImage(file); // maxWidth 1200, quality 0.8 (defaults)
const thumbnail = await compressImage(file, { maxWidth: 300, quality: 0.6 });
```

**Notes**
- Uses `createImageBitmap` and `OffscreenCanvas` — both are standard in every browser this library targets (Firefox, Android Chrome; see [Getting started](getting-started.md)).
- The bitmap is explicitly closed after drawing, so a batch of compressions (e.g. multiple photos picked at once) doesn't hold decoded image memory longer than necessary.

---

[← Architecture](architecture.md) · [Docs home](../README.md#docs) · [Next: SW update flow →](sw-update-flow.md)
