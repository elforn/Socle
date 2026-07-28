import { test, expect } from '@playwright/test';

// readShareInbox() from _lib/core/share-inbox.js is not in the bundle for the reference app,
// so the page.evaluate() calls below replicate its logic directly against the Cache API.

async function waitForSW(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

// Post a multipart form to /share-target via fetch() with redirect:'manual'.
// An opaqueredirect response (type='opaqueredirect', status=0) means the SW
// intercepted the POST and returned the expected 303 redirect.
async function postShareTarget(page, { title = '', text = '', url = '', file = null } = {}) {
  return page.evaluate(async ({ title, text, url, fileData }) => {
    const fd = new FormData();
    fd.set('title', title);
    fd.set('text', text);
    fd.set('url', url);
    if (fileData) {
      const f = new File([new Uint8Array(fileData.bytes)], fileData.name, { type: fileData.type });
      fd.append('files', f, fileData.name);
    }
    const r = await fetch('/share-target', { method: 'POST', body: fd, redirect: 'manual' });
    return { status: r.status, type: r.type };
  }, { title, text, url, fileData: file });
}

// Replicate readShareInbox() — consume-once read from the share-inbox cache.
async function readShareInbox(page) {
  return page.evaluate(async () => {
    const cache = await caches.open('share-inbox');
    const indexResp = await cache.match('pending');
    if (!indexResp) return null;
    await cache.delete('pending');
    const { title, text, url, files: filesIndex } = await indexResp.json();
    const files = await Promise.all(filesIndex.map(async f => {
      const r = await cache.match(f.key);
      if (r) await cache.delete(f.key);
      const buf = r ? await r.arrayBuffer() : null;
      return { name: f.name, type: f.type, byteLength: buf ? buf.byteLength : 0, bytes: buf ? Array.from(new Uint8Array(buf)) : [] };
    }));
    return { title, text, url, files };
  });
}

test.describe('Share Target', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForSW(page);
  });

  test('POST to /share-target returns an opaqueredirect (303)', async ({ page }) => {
    const result = await postShareTarget(page, { title: 'hello', text: 'world', url: 'https://example.com' });
    expect(result.type).toBe('opaqueredirect');
  });

  test('text fields are stored in share-inbox and returned by readShareInbox()', async ({ page }) => {
    await postShareTarget(page, { title: 'shared title', text: 'shared text', url: 'https://example.com/shared' });
    const inbox = await readShareInbox(page);
    expect(inbox).not.toBeNull();
    expect(inbox.title).toBe('shared title');
    expect(inbox.text).toBe('shared text');
    expect(inbox.url).toBe('https://example.com/shared');
    expect(inbox.files).toEqual([]);
  });

  test('readShareInbox() is consume-once — returns null on second call', async ({ page }) => {
    await postShareTarget(page, { title: 'once' });
    await readShareInbox(page); // first read consumes it
    const second = await readShareInbox(page);
    expect(second).toBeNull();
  });

  test('shared file is stored and retrievable with correct name, type, and content', async ({ page }) => {
    // Minimal SCLE-prefixed bytes that mimic a real .telos handoff file
    const bytes = [0x53, 0x43, 0x4c, 0x45, 0x01, 0x02, 0x03];
    await postShareTarget(page, {
      title: 'with file',
      file: { bytes, name: 'handoff.telos', type: 'application/octet-stream' },
    });
    const inbox = await readShareInbox(page);
    expect(inbox.title).toBe('with file');
    expect(inbox.files).toHaveLength(1);
    expect(inbox.files[0].name).toBe('handoff.telos');
    expect(inbox.files[0].type).toBe('application/octet-stream');
    expect(inbox.files[0].byteLength).toBe(bytes.length);
    expect(inbox.files[0].bytes).toEqual(bytes);
  });

  test('readShareInbox() returns null when no share is pending', async ({ page }) => {
    const inbox = await readShareInbox(page);
    expect(inbox).toBeNull();
  });
});
