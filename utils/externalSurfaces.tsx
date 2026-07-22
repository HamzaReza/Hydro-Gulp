import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';

import {
  cancelCompanion,
  updateCompanion,
} from '../services/companionNotification';
import { setTileState } from '../services/hydroBridge';
import {
  liveTodayTotalMl,
  readStateSnapshot,
} from '../services/stateSnapshot';
import { HydroWidget } from '../widgets/HydroWidget';
import { getDateDaysAgo, getTodayString } from './dateUtils';

/**
 * One call site keeps every out-of-app surface (ongoing notification,
 * home-screen widget, QS tile) consistent with current state. Invoke after
 * anything that changes today's total, the goal, presets, or premium status.
 *
 * `live` overrides cover redux-persist's write lag: the in-app caller
 * (NotificationGate) knows fresher values than the persisted snapshot, which
 * background contexts fall back to.
 */
export interface LiveSurfaceState {
  totalMl?: number;
  goalMl?: number;
  presets?: number[];
  companionOn?: boolean;
}

export async function syncExternalSurfaces(
  live?: LiveSurfaceState,
): Promise<void> {
  const snapshot = await readStateSnapshot();
  if (!snapshot) return;
  const total = live?.totalMl ?? (await liveTodayTotalMl(snapshot));
  const goal = live?.goalMl ?? snapshot.goalMl;
  const presets = live?.presets ?? snapshot.quickAddPresets;
  const companionOn =
    (live?.companionOn ?? snapshot.companionEnabled) && snapshot.isPremium;

  if (companionOn) {
    await updateCompanion(total, goal, presets);
  } else {
    await cancelCompanion();
  }

  try {
    await requestWidgetUpdate({
      widgetName: 'HydroProgress',
      renderWidget: () => (
        <HydroWidget
          totalMl={total}
          goalMl={goal}
          presets={presets}
          isPremium={snapshot.isPremium}
          weeklyTotals={
            snapshot.isPremium
              ? Array.from({ length: 7 }, (_, i) => {
                  const logs =
                    snapshot.logsByDate[getDateDaysAgo(6 - i)] ?? [];
                  return logs.reduce(
                    (sum, l) => sum + (l.hydrationValue ?? 0),
                    0,
                  );
                })
              : []
          }
        />
      ),
      widgetNotFound: () => {},
    });
  } catch {
    // No widget placed / library unavailable — fine.
  }

  await setTileState({
    todayTotalMl: total,
    goalMl: goal,
    defaultAmountMl: presets[0] ?? 250,
    date: getTodayString(),
  });
}
