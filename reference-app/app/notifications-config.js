// Shared contract between the Settings toggle (year-header.js), main.js, and
// app/sw-extensions.js — that last file is a classic script appended to the
// Service Worker and cannot import these, so its copies of the message type
// and cold-launch param must be kept in sync by hand if either ever changes.
export const NOTIFICATIONS_PREFS_KEY    = 'youryear:notificationsEnabled';
export const NOTIFICATIONS_DEDUP_DB     = 'youryear-notifications';
export const NOTIFICATIONS_TAG          = 'youryear-digest';
export const NOTIFICATIONS_OPEN_MESSAGE = 'youryear:open-digest';
export const NOTIFICATIONS_COLD_PARAM   = 'notif';
