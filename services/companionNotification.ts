import notifee from '@notifee/react-native';

import { Brand, companionBody } from '../constants/branding';
import {
  COMPANION_CHANNEL_ID,
  KIND_COMPANION,
  ensureChannels,
  logActions,
} from './notifications';
import { liveTodayTotalMl, readStateSnapshot } from './stateSnapshot';

/**
 * The Pro "hydration companion": a silent ongoing notification pinned in the
 * shade with today's progress and quick-add buttons. Not a foreground service
 * — Android 14+ users can swipe it away; it returns on the next update.
 */
export const COMPANION_NOTIFICATION_ID = 'companion';

export async function updateCompanion(
  totalMl: number,
  goalMl: number,
  presets: number[],
): Promise<void> {
  await ensureChannels();
  const { data, actions } = logActions(presets);
  try {
    await notifee.displayNotification({
      id: COMPANION_NOTIFICATION_ID,
      title: Brand.companionTitle,
      body: companionBody(totalMl, goalMl),
      data: { kind: KIND_COMPANION, ...data },
      android: {
        channelId: COMPANION_CHANNEL_ID,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        pressAction: { id: 'default', launchActivity: 'default' },
        progress: {
          max: Math.max(goalMl, 1),
          current: Math.min(totalMl, Math.max(goalMl, 1)),
        },
        actions,
      },
    });
  } catch (error) {
    console.error('Failed to update companion notification:', error);
  }
}

export async function cancelCompanion(): Promise<void> {
  try {
    await notifee.cancelNotification(COMPANION_NOTIFICATION_ID);
  } catch {
    // Nothing displayed — fine.
  }
}

/**
 * Refresh from persisted state — usable from background contexts where no
 * redux store exists. No-ops unless the user is Pro with the toggle on.
 */
export async function refreshCompanionFromSnapshot(): Promise<void> {
  const snapshot = await readStateSnapshot();
  if (!snapshot) return;
  if (!snapshot.isPremium || !snapshot.companionEnabled) {
    await cancelCompanion();
    return;
  }
  const total = await liveTodayTotalMl(snapshot);
  await updateCompanion(total, snapshot.goalMl, snapshot.quickAddPresets);
}
