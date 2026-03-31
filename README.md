# Hydro: Gulp

A full-featured water intake tracker built with React Native Expo. Features Firebase Auth, Firestore sync, Redux state management, glassmorphism UI, subscription paywall, dark/light mode, and smart reminders.

---

## Features

- **Authentication** — Firebase email/password auth (Sign Up, Sign In, Forgot Password)
- **Home** — Animated SVG progress ring, quick-add buttons, custom log bottom sheet, celebration animation
- **History** — Weekly/monthly bar charts, streak stats, calendar heatmap (Pro), expandable day logs, CSV export (Pro)
- **Analytics** — Avg intake, drink breakdown donut chart, time-of-day heatmap, hydration score, insights (Pro)
- **Reminders** — Push notification reminders, smart schedule generation (Pro), visual timeline
- **Profile** — Edit name/goal/unit/sleep times, theme toggle, biometric lock (Pro), subscription management
- **Paywall** — Monthly ($2.99) and yearly ($19.99) plans with 3-day free trial UI
- **Offline Support** — Firestore offline persistence + Redux local cache
- **Dark/Light Mode** — Full glassmorphism design with expo-blur

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 51 |
| Navigation | expo-router (file-based) |
| State | Redux Toolkit + redux-persist |
| Backend | Firebase Auth + Firestore |
| UI | expo-blur, expo-linear-gradient |
| Animation | react-native-reanimated |
| Charts | react-native-svg |
| Notifications | expo-notifications |
| Biometrics | expo-local-authentication |
| Fonts | @expo-google-fonts/inter |

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd WaterTracking
npm install
```

Or to install all packages individually:

```bash
npx expo install expo@~51.0.28 expo-router@~3.5.23
npx expo install @reduxjs/toolkit react-redux redux-persist
npx expo install @react-native-async-storage/async-storage
npx expo install expo-blur expo-linear-gradient expo-haptics
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install react-native-svg react-native-screens
npx expo install expo-notifications expo-local-authentication
npx expo install expo-safe-area-context expo-splash-screen expo-status-bar
npx expo install expo-font expo-crypto
npx expo install @expo-google-fonts/inter
npx expo install @expo/vector-icons
npx expo install firebase
npx expo install lottie-react-native
```

### 2. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Enable **Email/Password** authentication:
   - Authentication > Sign-in methods > Email/Password > Enable
4. Create a **Firestore Database**:
   - Firestore Database > Create database > Start in production mode
5. Copy your Firebase config:
   - Project Settings > Your apps > Web app > Config object
6. Create `.env` file from template:

```bash
cp .env.example .env
```

7. Fill in your Firebase credentials in `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Firestore Security Rules

In Firestore > Rules, paste the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /logs/{logId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /reminders/{reminderId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

### 4. Run the App

```bash
# Start dev server
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android
```

---

## Project Structure

```
WaterTracking/
├── app/
│   ├── _layout.tsx              # Root layout + Firebase auth listener
│   ├── (auth)/
│   │   ├── welcome.tsx          # Welcome screen
│   │   ├── login.tsx            # Login screen
│   │   ├── signup.tsx           # Sign up screen
│   │   └── forgot-password.tsx  # Password reset
│   ├── (onboarding)/
│   │   └── index.tsx            # 3-slide onboarding
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Floating glassy tab bar
│   │   ├── index.tsx            # Home (ring + logs)
│   │   ├── history.tsx          # History + charts
│   │   ├── analytics.tsx        # Analytics (Pro)
│   │   ├── reminders.tsx        # Reminders + scheduling
│   │   └── profile.tsx          # Profile + settings
│   └── subscription.tsx         # Paywall modal
├── components/
│   ├── ui/
│   │   ├── GlassCard.tsx        # Glassmorphism card
│   │   ├── GradientButton.tsx   # Gradient/ghost button
│   │   ├── AnimatedRing.tsx     # SVG circular progress
│   │   ├── BottomSheet.tsx      # Reanimated bottom sheet
│   │   └── PremiumLock.tsx      # Blur overlay lock
│   └── charts/
│       ├── WeeklyBarChart.tsx   # SVG bar chart
│       ├── HeatmapCalendar.tsx  # Calendar heatmap
│       └── DonutChart.tsx       # Pie/donut chart
├── hooks/
│   ├── useTheme.ts              # Theme colors from Redux
│   ├── useHydration.ts          # Hydration data + actions
│   ├── useStreak.ts             # Streak calculations
│   └── usePremium.ts            # Subscription status
├── store/
│   ├── index.ts                 # Store + persistor
│   └── slices/
│       ├── authSlice.ts         # Firebase Auth state
│       ├── hydrationSlice.ts    # Logs + Firestore thunks
│       ├── profileSlice.ts      # User profile
│       ├── settingsSlice.ts     # Theme, notifications, reminders
│       └── subscriptionSlice.ts # Premium state
├── constants/
│   ├── theme.ts                 # Full color palette + tokens
│   └── drinks.ts                # Drink types + multipliers
├── utils/
│   ├── dateUtils.ts             # Date formatting helpers
│   └── notificationUtils.ts    # Notification scheduling
├── firebase.ts                  # Firebase initialization
├── .env.example                 # Environment template
└── README.md
```

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Dark Navy | `#355872` | Brand, headers, dark bg |
| Medium Blue | `#7AAACE` | Buttons, accents, icons |
| Light Blue | `#9CD5FF` | Highlights, progress fills |
| Off White | `#F7F8F0` | Text on dark, light bg |
| Dark BG | `#1A2E3D` | Dark mode background |

---

## Subscription Plans

| Feature | Free | Pro |
|---------|------|-----|
| Daily water tracking | ✅ | ✅ |
| Quick-add buttons | ✅ | ✅ |
| Basic charts (7d) | ✅ | ✅ |
| 1 daily reminder | ✅ | ✅ |
| Monthly calendar heatmap | ❌ | ✅ |
| Full analytics + Hydration Score | ❌ | ✅ |
| Unlimited smart reminders (8) | ❌ | ✅ |
| CSV export | ❌ | ✅ |
| Biometric lock | ❌ | ✅ |

**Pricing:**
- Monthly: $2.99/month
- Yearly: $19.99/year (save 44%)
- 3-day free trial for new subscribers

---

## Firestore Data Model

```
users/{uid}
  - name: string
  - email: string
  - goal: number (ml)
  - unit: "ml" | "oz"
  - wakeTime: "HH:mm"
  - sleepTime: "HH:mm"
  - isPremium: boolean
  - premiumPlan: "monthly" | "yearly" | null
  - premiumExpiry: Timestamp | null
  - avatarColor: string

users/{uid}/logs/{logId}
  - amount: number
  - unit: "ml" | "oz"
  - type: "water" | "juice" | "tea" | "coffee" | "sports"
  - timestamp: Timestamp
  - date: "YYYY-MM-DD"
  - hydrationValue: number

users/{uid}/reminders/{reminderId}
  - time: "HH:mm"
  - enabled: boolean
  - label: string
  - smartReminder: boolean
```

---

## Notes for Production

1. **RevenueCat Integration** — Replace `updateSubscriptionThunk` with `react-native-purchases` SDK for real in-app purchases. The current implementation uses a mock Firestore update.

2. **Push Notifications** — For background notifications on Android, consider migrating to `@react-native-firebase/messaging` for better reliability.

3. **Offline Persistence** — Firestore JS SDK uses IndexedDB on web. On native, it uses an in-memory cache by default. For better native offline support, use `@react-native-firebase/firestore`.

4. **Security** — Never commit `.env` to version control. Rotate Firebase API keys if accidentally exposed.
