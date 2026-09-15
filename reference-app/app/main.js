import { initTheme } from '../_lib/core/theme/theme.js';
import './strings.js';
import './locales/fr.js';
import './locales/ca.js';
import { setLocale, getLocale } from '../_lib/core/strings.js';
import { boot } from '../_lib/core/store/store.js';
import { reducer } from './store/reducer.js';
import '../_lib/core/router/app-router.js';
import '../_lib/core/sw-manager/sw-manager.js';
import '../_lib/core/components/update-banner/update-banner.js';
import '../_lib/modules/notifications/digest-notifier.js';
import { NotificationPrefs } from '../_lib/modules/notifications/notification-prefs.js';
import { NotificationDedup } from '../_lib/modules/notifications/notification-dedup.js';
import { consumeColdLaunchParam, onColdLaunchMessage } from '../_lib/modules/notifications/cold-launch.js';
import { buildDigest } from './notifications-digest.js';
import {
  NOTIFICATIONS_PREFS_KEY, NOTIFICATIONS_DEDUP_DB, NOTIFICATIONS_TAG,
  NOTIFICATIONS_OPEN_MESSAGE, NOTIFICATIONS_COLD_PARAM,
} from './notifications-config.js';
import './pages/year-redirect.js';
import './pages/home-page.js';
import './pages/not-found-page.js';

initTheme();
setLocale(getLocale());

await boot({ dbName: 'youryear', reducer });

const swm = document.createElement('sw-manager');
swm.setAttribute('base-path', __BASE_PATH__);
swm.setAttribute('app-version', __APP_VERSION__);
document.body.prepend(swm);

const notifier = document.createElement('digest-notifier');
notifier.prefs = NotificationPrefs(NOTIFICATIONS_PREFS_KEY);
notifier.dedup = NotificationDedup(NOTIFICATIONS_DEDUP_DB);
notifier.buildDigest = buildDigest;
notifier.tag = NOTIFICATIONS_TAG;
document.body.appendChild(notifier);

// A tapped digest notification can arrive as a cold start (URL param, read
// once and stripped) or as a message to an already-open tab (see
// app/sw-extensions.js's notificationclick handler) — both are handled the
// same way here since there is no separate "digest view" to route to.
if (consumeColdLaunchParam(NOTIFICATIONS_COLD_PARAM)) window.scrollTo(0, 0);
onColdLaunchMessage(NOTIFICATIONS_OPEN_MESSAGE, () => window.scrollTo({ top: 0, behavior: 'smooth' }));

console.log('YourYear', __APP_VERSION__);

const router = document.querySelector('app-router');
router.routes = [
  { path: '/',       component: 'year-redirect' },
  { path: '/:year',  component: 'home-page' },
  { path: '*',       component: 'not-found-page' },
];
