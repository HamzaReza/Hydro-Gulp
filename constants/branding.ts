/** User-facing copy — keep in sync with `app.json` → expo.name */
export const Brand = {
  appName: 'Hydro: Gulp',
  /** Short premium tier name (catchy on buttons) */
  proName: 'Gulp Pro',
  proUnlockShort: 'Unlock Gulp Pro — hydrate smarter, not harder.',
  proCta: 'Get Gulp Pro',
  reminderTitle: 'Hydro: Gulp — sip time!',
  reminderBodyFallback: "Time to hydrate! Don't forget your water.",
  snoozeTitle: 'Hydro: Gulp — snoozed reminder',
  companionTitle: 'Hydration today',
  streakRiskTitle: 'Your streak is at risk! 🔥',
} as const;

/** "Your 12-day streak ends in ~2 hours" — computed at schedule time. */
export const streakRiskBody = (streakDays: number): string =>
  `Your ${streakDays}-day streak ends tonight. A few sips will save it!`;

/** Companion notification body, e.g. "1,250 / 2,500 ml — 50%". */
export const companionBody = (totalMl: number, goalMl: number): string => {
  const pct = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0;
  return `${totalMl.toLocaleString()} / ${goalMl.toLocaleString()} ml — ${pct}%`;
};
