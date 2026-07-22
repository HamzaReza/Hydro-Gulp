import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { Brand } from '../constants/branding';

/**
 * Home-screen widget rendered to RemoteViews — only react-native-android-widget
 * primitives are allowed here (no RN components, no SVG).
 */
export interface HydroWidgetProps {
  totalMl: number;
  goalMl: number;
  presets: number[];
  isPremium: boolean;
  /** Last 7 day totals (oldest first) for the Pro mini-bar row. */
  weeklyTotals?: number[];
}

const BG = '#152a38';
const CARD = '#1e3448';
const TEXT = '#F7F8F0';
const MUTED = '#9CB8CE';
const ACCENT = '#9CD5FF';
const TRACK = '#0f2230';

export function HydroWidget({
  totalMl,
  goalMl,
  presets,
  isPremium,
  weeklyTotals = [],
}: HydroWidgetProps) {
  const goal = Math.max(goalMl, 1);
  const pct = Math.min(Math.round((totalMl / goal) * 100), 100);
  const p0 = presets[0] ?? 250;
  const p1 = presets[1] ?? 500;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 24,
        padding: 14,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={`💧 ${Brand.appName}`}
          style={{ fontSize: 13, color: MUTED, fontWeight: '600' }}
        />
        <TextWidget
          text={`${pct}%`}
          style={{ fontSize: 15, color: ACCENT, fontWeight: '700' }}
        />
      </FlexWidget>

      <TextWidget
        text={`${totalMl.toLocaleString()} / ${goal.toLocaleString()} ml`}
        style={{ fontSize: 22, color: TEXT, fontWeight: '700' }}
      />

      {/* Progress bar: flex-weighted filled + remainder segments. */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          height: 10,
          borderRadius: 5,
          backgroundColor: TRACK,
        }}
      >
        <FlexWidget
          style={{
            flex: Math.max(pct, 2),
            height: 'match_parent',
            borderRadius: 5,
            backgroundColor: ACCENT,
          }}
        />
        <FlexWidget
          style={{
            flex: Math.max(100 - Math.max(pct, 2), 0),
            height: 'match_parent',
          }}
        />
      </FlexWidget>

      {isPremium && weeklyTotals.length > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            height: 18,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {weeklyTotals.map((t, i) => (
            <FlexWidget
              key={`bar-${i}`}
              style={{
                width: 24,
                height: Math.max(4, Math.min(Math.round((t / goal) * 18), 18)),
                borderRadius: 2,
                backgroundColor: t >= goal ? ACCENT : MUTED,
              }}
            />
          ))}
        </FlexWidget>
      )}

      <FlexWidget
        style={{ flexDirection: 'row', width: 'match_parent' }}
      >
        <FlexWidget
          clickAction="LOG_PRESET_0"
          style={{
            flex: 1,
            height: 40,
            borderRadius: 20,
            backgroundColor: CARD,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 6,
          }}
        >
          <TextWidget
            text={`+${p0} ml`}
            style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="LOG_PRESET_1"
          style={{
            flex: 1,
            height: 40,
            borderRadius: 20,
            backgroundColor: CARD,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 6,
          }}
        >
          <TextWidget
            text={`+${p1} ml`}
            style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
