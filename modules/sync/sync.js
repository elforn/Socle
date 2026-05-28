import { getAllEvents, getAllBlobs, importEvents, attachBlob } from '../../core/store/store.js';

const SOCLE_VERSION = 1;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function exportData({ eventFilter } = {}) {
  const allEvents = await getAllEvents();
  const events = eventFilter ? allEvents.filter(eventFilter) : allEvents;

  const allBlobs = await getAllBlobs();
  let blobsToExport = allBlobs;
  if (eventFilter) {
    const referencedIds = new Set(events.flatMap(e => e.payload?.imageId ? [e.payload.imageId] : []));
    blobsToExport = allBlobs.filter(b => referencedIds.has(b.id));
  }
  const images = await Promise.all(
    blobsToExport.map(async ({ id, blob }) => ({ id, dataUrl: await blobToDataUrl(blob) }))
  );

  return { socleVersion: SOCLE_VERSION, exportedAt: new Date().toISOString(), events, images };
}

export async function importData(data) {
  if (data?.socleVersion !== SOCLE_VERSION) {
    throw new Error(`Invalid or incompatible export file (socleVersion: ${data?.socleVersion ?? 'missing'})`);
  }

  const existing = new Set((await getAllEvents()).map(e => e.id));
  const newEvents = (data.events ?? []).filter(e => !existing.has(e.id));
  await importEvents(newEvents);

  const existingBlobs = new Set((await getAllBlobs()).map(b => b.id));
  const newImages = (data.images ?? []).filter(img => !existingBlobs.has(img.id));
  for (const { id, dataUrl } of newImages) {
    await attachBlob(id, dataUrlToBlob(dataUrl));
  }

  return { eventsAdded: newEvents.length, imagesAdded: newImages.length };
}

export function downloadExport(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
