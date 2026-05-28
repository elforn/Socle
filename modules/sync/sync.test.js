// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportData, importData, downloadExport, readImportFile } from './sync.js';
import { boot, reset, dispatch, attachBlob, getBlob, getAllEvents } from '../../core/store/store.js';
import * as Store from '../../core/store/store.js';

// happy-dom does not implement URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

let dbSeq = 0;
function freshName() { return `sync-test-${dbSeq++}`; }
const reducer = (s, e) => {
  if (e.type === 'item:added') return { ...s, items: [...(s.items ?? []), e.payload] };
  return s;
};

beforeEach(async () => {
  reset();
  await boot({ dbName: freshName(), reducer });
});

afterEach(() => reset());

describe('exportData', () => {
  it('returns required top-level fields', async () => {
    const data = await exportData();
    expect(data.socleVersion).toBe(1);
    expect(typeof data.exportedAt).toBe('string');
    expect(Array.isArray(data.events)).toBe(true);
    expect(Array.isArray(data.images)).toBe(true);
  });

  it('includes all events when no filter provided', async () => {
    await dispatch('item:added', { year: '2025', title: 'a' });
    await dispatch('item:added', { year: '2026', title: 'b' });
    const data = await exportData();
    expect(data.events).toHaveLength(2);
  });

  it('filters events when eventFilter is provided', async () => {
    await dispatch('item:added', { year: '2025', title: 'a' });
    await dispatch('item:added', { year: '2026', title: 'b' });
    const data = await exportData({ eventFilter: e => e.payload.year === '2026' });
    expect(data.events).toHaveLength(1);
    expect(data.events[0].payload.title).toBe('b');
  });

  it('only includes blobs referenced by filtered events', async () => {
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    vi.spyOn(Store, 'getAllBlobs').mockResolvedValueOnce([
      { id: 'img-2025', blob: mockBlob },
      { id: 'img-2026', blob: mockBlob },
    ]);
    await dispatch('item:added', { year: '2025', imageId: 'img-2025' });
    await dispatch('item:added', { year: '2026', imageId: 'img-2026' });
    const data = await exportData({ eventFilter: e => e.payload.year === '2026' });
    expect(data.events).toHaveLength(1);
    expect(data.images).toHaveLength(1);
    expect(data.images[0].id).toBe('img-2026');
    expect(data.images[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('includes all blobs when no event filter provided', async () => {
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    vi.spyOn(Store, 'getAllBlobs').mockResolvedValueOnce([
      { id: 'img-1', blob: mockBlob },
      { id: 'img-2', blob: mockBlob },
    ]);
    const data = await exportData();
    expect(data.images).toHaveLength(2);
  });

  it('exports empty images array when no blobs exist', async () => {
    const data = await exportData();
    expect(data.images).toEqual([]);
  });
});

describe('importData', () => {
  it('throws for missing socleVersion', async () => {
    await expect(importData({})).rejects.toThrow('Invalid or incompatible');
  });

  it('throws for wrong socleVersion', async () => {
    await expect(importData({ socleVersion: 99 })).rejects.toThrow('Invalid or incompatible');
  });

  it('throws for null input', async () => {
    await expect(importData(null)).rejects.toThrow('Invalid or incompatible');
  });

  it('imports new events and returns count', async () => {
    const foreign = [
      { id: 'e1', deviceId: null, recordedAt: 1000, occurredAt: 1000, type: 'item:added', payload: { title: 'imported' } },
    ];
    const result = await importData({ socleVersion: 1, events: foreign, images: [] });
    expect(result.eventsAdded).toBe(1);
    expect(result.imagesAdded).toBe(0);
    const all = await getAllEvents();
    expect(all).toHaveLength(1);
  });

  it('skips duplicate events (idempotent on id)', async () => {
    await dispatch('item:added', { title: 'original' });
    const existing = await getAllEvents();
    const result = await importData({ socleVersion: 1, events: existing, images: [] });
    expect(result.eventsAdded).toBe(0);
    const all = await getAllEvents();
    expect(all).toHaveLength(1);
  });

  it('round-trips events: export then import into a fresh store', async () => {
    await dispatch('item:added', { title: 'hello' });
    const data = await exportData();
    reset();
    await boot({ dbName: freshName(), reducer });
    const result = await importData(data);
    expect(result.eventsAdded).toBe(1);
    const all = await getAllEvents();
    expect(all[0].payload.title).toBe('hello');
  });

  it('round-trips blobs: import a data URL and retrieve as Blob', async () => {
    // Provide a pre-serialised data URL (bypasses fake-indexeddb Blob limitations)
    const payload = {
      socleVersion: 1,
      events: [],
      images: [{ id: 'img-1', dataUrl: 'data:image/jpeg;base64,cGl4ZWxz' }],
    };
    const result = await importData(payload);
    expect(result.imagesAdded).toBe(1);
    const blob = await getBlob('img-1');
    // fake-indexeddb strips Blob prototype on structuredClone — check properties, not instanceof
    expect(blob).toBeTruthy();
    expect(blob.type).toBe('image/jpeg');
  });

  it('skips duplicate blobs on second import', async () => {
    const payload = {
      socleVersion: 1,
      events: [],
      images: [{ id: 'img-2', dataUrl: 'data:image/jpeg;base64,cGl4ZWxz' }],
    };
    await importData(payload);
    const result = await importData(payload);
    expect(result.imagesAdded).toBe(0);
  });
});

describe('downloadExport', () => {
  it('creates an anchor with the correct filename and clicks it', () => {
    const clicks = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = realCreate(tag);
      if (tag === 'a') el.click = () => clicks.push(el.download);
      return el;
    });

    downloadExport({ socleVersion: 1, events: [], images: [] }, 'my-export.json');
    expect(clicks).toEqual(['my-export.json']);
    vi.restoreAllMocks();
  });
});

describe('readImportFile', () => {
  it('parses a valid JSON file', async () => {
    const content = JSON.stringify({ socleVersion: 1, events: [], images: [] });
    const file = new File([content], 'export.json', { type: 'application/json' });
    const data = await readImportFile(file);
    expect(data.socleVersion).toBe(1);
  });

  it('rejects on invalid JSON', async () => {
    const file = new File(['not json {{'], 'bad.json', { type: 'application/json' });
    await expect(readImportFile(file)).rejects.toThrow('Invalid JSON');
  });
});
