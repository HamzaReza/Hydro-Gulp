import type { AppDispatch } from "../store";
import { seedInsight } from "../store/slices/aiSlice";
import { setHasSeenOnboarding, setUser } from "../store/slices/authSlice";
import {
  HydrationLog,
  seedLogs,
  setGoal,
  setUnit,
} from "../store/slices/hydrationSlice";
import { setProfile } from "../store/slices/profileSlice";
import {
  Reminder,
  setNotificationsEnabled,
  setReminders,
} from "../store/slices/settingsSlice";
import { setSubscription } from "../store/slices/subscriptionSlice";
import { formatDate, getDateDaysAgo, getTodayString } from "../utils/dateUtils";
import { getMonthKey } from "../utils/streakUtils";
import { getDrinkById } from "./drinks";

const DEMO_GOAL = 2500;
const DAYS_OF_HISTORY = 240;
// A below-goal day inside the current streak, saved by a streak freeze —
// shows the frozen (ice-blue) heatmap cell in store screenshots.
const FROZEN_DAYS_AGO = 10;

/** Deterministic PRNG so every build produces identical screenshots. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type DrinkPick = { type: string; amounts: number[] };

const MORNING_DRINKS: DrinkPick[] = [
  { type: "water", amounts: [350, 500] },
  { type: "coffee", amounts: [200, 250] },
  { type: "green_tea", amounts: [250, 300] },
];

const DAY_DRINKS: DrinkPick[] = [
  { type: "water", amounts: [250, 350, 500] },
  { type: "water", amounts: [250, 350, 500] },
  { type: "water", amounts: [350, 500] },
  { type: "sparkling", amounts: [330, 500] },
  { type: "tea", amounts: [250, 300] },
  { type: "juice", amounts: [250, 300] },
  { type: "coconut_water", amounts: [330] },
  { type: "smoothie", amounts: [350] },
];

function makeLog(
  date: string,
  hour: number,
  minute: number,
  type: string,
  amount: number,
  index: number,
): HydrationLog {
  const drink = getDrinkById(type);
  const timestamp =
    new Date(`${date}T00:00:00`).getTime() + (hour * 60 + minute) * 60 * 1000;
  return {
    id: `demo-${date}-${index}`,
    amount,
    unit: "ml",
    type,
    timestamp,
    date,
    hydrationValue: Math.round(amount * drink.hydrationMultiplier),
  };
}

/** Generate one day's logs aiming at `target` ml of hydration value. */
function buildDay(
  date: string,
  target: number,
  rand: () => number,
): HydrationLog[] {
  const logs: HydrationLog[] = [];
  let total = 0;
  let index = 0;

  // Morning entries (7:30–9:30)
  const morningCount = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < morningCount; i++) {
    const pick = MORNING_DRINKS[Math.floor(rand() * MORNING_DRINKS.length)];
    const amount = pick.amounts[Math.floor(rand() * pick.amounts.length)];
    const log = makeLog(
      date,
      7 + Math.floor(rand() * 2),
      10 + Math.floor(rand() * 50),
      pick.type,
      amount,
      index++,
    );
    logs.push(log);
    total += log.hydrationValue;
  }

  // Spread the rest across 10:00–21:30
  let hour = 10;
  while (total < target && hour <= 21) {
    const pick = DAY_DRINKS[Math.floor(rand() * DAY_DRINKS.length)];
    const amount = pick.amounts[Math.floor(rand() * pick.amounts.length)];
    const log = makeLog(
      date,
      hour,
      Math.floor(rand() * 59),
      pick.type,
      amount,
      index++,
    );
    logs.push(log);
    total += log.hydrationValue;
    hour += 1 + Math.floor(rand() * 2);
  }

  // Top up with evening water so goal-met days actually meet the target —
  // otherwise streak days can silently fall short and break the streak.
  let minute = 5;
  while (total < target) {
    const log = makeLog(date, 22, minute, "water", 500, index++);
    logs.push(log);
    total += log.hydrationValue;
    minute += 15;
  }

  return logs;
}

export function buildDemoLogs(): Record<string, HydrationLog[]> {
  const rand = mulberry32(20260713);
  const logs: Record<string, HydrationLog[]> = {};

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 1; daysAgo--) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const date = formatDate(d);

    // Shape the story: a 16-day live streak ending yesterday, a 28-day
    // personal-best run two months back, occasional off days elsewhere.
    const inCurrentStreak = daysAgo <= 16;
    const inBestRun = daysAgo >= 60 && daysAgo <= 87;

    let target: number;
    if (daysAgo === 17) {
      // Deliberate miss so the current streak is exactly 16 days
      target = DEMO_GOAL * 0.55;
    } else if (daysAgo === FROZEN_DAYS_AGO) {
      // Below-goal day protected by a streak freeze (seeded in seedDemoState)
      target = DEMO_GOAL * 0.5;
    } else if (inCurrentStreak || inBestRun) {
      target = DEMO_GOAL * (1.0 + rand() * 0.18);
    } else {
      const roll = rand();
      if (roll < 0.08) continue; // skipped day — gap in the heatmap
      if (roll < 0.3) {
        target = DEMO_GOAL * (0.45 + rand() * 0.4); // missed the goal
      } else {
        target = DEMO_GOAL * (1.0 + rand() * 0.15);
      }
    }

    const day = buildDay(date, target, rand);
    if (day.length) logs[date] = day;
  }

  // Today: 95% complete by evening — ring looks alive, goal within reach,
  // no goal-reached celebration overlay to block the screenshot.
  const today = formatDate(new Date());
  logs[today] = [
    makeLog(today, 7, 40, "water", 500, 0),
    makeLog(today, 8, 55, "coffee", 250, 1),
    makeLog(today, 10, 20, "water", 500, 2),
    makeLog(today, 11, 5, "green_tea", 300, 3),
    makeLog(today, 13, 25, "sparkling", 330, 4),
  ];

  return logs;
}

/** A reminder ~2 min after launch so screenshots can capture a live
 *  notification with its quick-log action buttons. Demo builds only. */
function nearFutureTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DEMO_REMINDERS: Reminder[] = [
  {
    id: "demo-r0",
    time: nearFutureTime(),
    enabled: true,
    label: "Sip break! 💧",
    smartReminder: false,
  },
  {
    id: "demo-r1",
    time: "08:00",
    enabled: true,
    label: "Morning kickstart 🌅",
    smartReminder: false,
  },
  {
    id: "demo-r2",
    time: "12:30",
    enabled: true,
    label: "Lunchtime hydration",
    smartReminder: false,
  },
  {
    id: "demo-r3",
    time: "16:00",
    enabled: true,
    label: "Afternoon boost ⚡",
    smartReminder: false,
  },
  {
    id: "demo-r4",
    time: "21:00",
    enabled: false,
    label: "Wind down 🌙",
    smartReminder: false,
  },
];

export function seedDemoState(dispatch: AppDispatch) {
  dispatch(setHasSeenOnboarding(true));
  dispatch(
    setUser({
      uid: "demo-user",
      email: "sam.carter@gmail.com",
      displayName: "Sam Carter",
    }),
  );
  dispatch(
    setProfile({
      name: "Sam Carter",
      avatarColor: "#7AAACE",
      goal: DEMO_GOAL,
      unit: "ml",
      wakeTime: "07:00",
      sleepTime: "23:00",
      quickAddPresets: [100, 150, 250, 350, 500, 750, 1000],
      streakFreezes: {
        monthKey: getMonthKey(),
        used: 1,
        frozenDates: [getDateDaysAgo(FROZEN_DAYS_AGO)],
        lastCheckDate: getTodayString(),
      },
    }),
  );
  dispatch(setGoal(DEMO_GOAL));
  dispatch(setUnit("ml"));
  dispatch(seedLogs(buildDemoLogs()));
  dispatch(
    setSubscription({
      isPremium: true,
      plan: "yearly",
      expiryDate: Date.now() + 280 * 24 * 60 * 60 * 1000,
    }),
  );
  dispatch(setReminders(DEMO_REMINDERS));
  dispatch(setNotificationsEnabled(true));
  dispatch(
    seedInsight({
      quote:
        "Every glass you pour is a promise you keep to yourself — 16 days strong and counting.",
      suggestion:
        "You tend to slow down after 3 PM. Keep a filled bottle on your desk for the afternoon and you'll cruise past your 2.5L goal.",
    }),
  );
}
