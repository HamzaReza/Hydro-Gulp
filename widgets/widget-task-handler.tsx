import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { getDrinkById } from '../constants/drinks';
import { refreshCompanionFromSnapshot } from '../services/companionNotification';
import { appendPendingLog } from '../services/pendingLogs';
import {
  liveTodayTotalMl,
  readStateSnapshot,
  StateSnapshot,
} from '../services/stateSnapshot';
import { formatDate, getDateDaysAgo } from '../utils/dateUtils';
import { HydroWidget } from './HydroWidget';

/**
 * Runs in a headless RN context (AsyncStorage available, no redux store).
 * Clicks queue pending logs — the same queue notification actions use — and
 * the app drains everything into redux + Firestore on next foreground.
 */

function weeklyTotals(snapshot: StateSnapshot): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = getDateDaysAgo(6 - i);
    const logs = snapshot.logsByDate[date] ?? [];
    return logs.reduce((sum, l) => sum + (l.hydrationValue ?? 0), 0);
  });
}

async function renderCurrent(
  props: WidgetTaskHandlerProps,
  optimisticExtraMl = 0,
): Promise<void> {
  const snapshot = await readStateSnapshot();
  if (!snapshot) {
    props.renderWidget(
      <HydroWidget totalMl={0} goalMl={2000} presets={[250, 500]} isPremium={false} />,
    );
    return;
  }
  const total = (await liveTodayTotalMl(snapshot)) + optimisticExtraMl;
  props.renderWidget(
    <HydroWidget
      totalMl={total}
      goalMl={snapshot.goalMl}
      presets={snapshot.quickAddPresets}
      isPremium={snapshot.isPremium}
      weeklyTotals={snapshot.isPremium ? weeklyTotals(snapshot) : []}
    />,
  );
}

async function queuePresetLog(presetIndex: number): Promise<void> {
  const snapshot = await readStateSnapshot();
  const amount = snapshot?.quickAddPresets[presetIndex] ?? (presetIndex === 0 ? 250 : 500);
  const now = Date.now();
  const drink = getDrinkById('water');
  await appendPendingLog({
    id: `temp-${now}`,
    amount,
    unit: 'ml',
    type: drink.id,
    timestamp: now,
    date: formatDate(new Date(now)),
    hydrationValue: Math.round(amount * drink.hydrationMultiplier),
  });
  await refreshCompanionFromSnapshot();
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await renderCurrent(props);
      break;
    case 'WIDGET_CLICK': {
      if (props.clickAction === 'LOG_PRESET_0' || props.clickAction === 'LOG_PRESET_1') {
        await queuePresetLog(props.clickAction === 'LOG_PRESET_0' ? 0 : 1);
        await renderCurrent(props);
      }
      break;
    }
    default:
      break;
  }
}
