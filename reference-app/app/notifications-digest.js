import { t } from '../_lib/core/strings.js';

const currentYear = () => new Date().getFullYear();

// Deliberately not urgency/deadline framing — YourYear goals have no due
// dates. A nudge about goals still in progress is a different, equally
// valid kind of digest: buildDigest(state) can be about anything the app
// wants, which is the whole point of leaving it up to the app to supply.
export function buildDigest(state) {
  const goals = state?.goals?.[currentYear()] ?? [];
  const inProgress = goals.filter(g => (g.percentage ?? 0) < 100);
  if (inProgress.length === 0) return null;
  return {
    title: t('notifications.digest-title', { count: inProgress.length }),
    body: t('notifications.digest-body'),
  };
}
