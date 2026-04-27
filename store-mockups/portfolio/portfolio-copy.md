# Hydro: Gulp — Portfolio Case Study

---

## Project Title
Hydro: Gulp — Full-Stack React Native App (iOS & Android)

---

## Short Description  
*(Use this as your one-liner under the project title)*

Built a complete hydration tracking app from scratch — React Native (Expo), Firebase, AI insights, push reminders, and full Play Store / App Store listing.

---

## Project Overview

Hydro: Gulp is a cross-platform mobile app (iOS + Android) that helps users track daily water intake, build hydration habits, and get AI-powered coaching. I designed and built the entire product — from architecture to store listing.

The goal was a calm, beautiful app that people actually wanted to open every day.

---

## What I Built

### Core App
- React Native (Expo) with Expo Router file-based navigation
- Dark & light theme system with `LightTheme` / `DarkTheme` from a central token file
- Animated progress ring on the Today screen showing real-time intake vs. goal
- Quick-add buttons for common drinks (water, tea, coffee, sparkling, juice, etc.)
- Drink log with timestamps, edit, and delete

### History & Analytics
- 7-day bar chart of daily intake
- Monthly heatmap calendar showing hydration consistency
- Streak counter (current, longest, perfect days)
- Analytics tab: averages, drink breakdown pie chart, "By Time of Day" view

### AI Insights
- OpenRouter API integration (GPT-4o / Claude) for personalised coaching
- Context-aware prompts built from the user's actual data (goal, recent intake, streaks)
- Daily motivation messages and actionable "What To Do" guidance
- Auto-refresh cadence so insights feel timely, not stale

### Reminders
- Expo Notifications with full permission handling
- Smart reminder scheduler — nudges based on current pace vs. goal
- Custom time slots: Morning / Afternoon / Evening
- Timeline view showing all active reminders

### Auth & Profile
- Google Sign-In via `@react-native-google-signin`
- Firebase Auth + Firestore for user data sync
- Profile screen: daily goal setting, unit preference (metric/imperial), app appearance
- Subscription management (Pro tier)

### Store Listing Assets
- 512×512 transparent app icon (mascot-based, background-removed with Pillow)
- 1024×500 Play Store feature graphic (theme-aligned, programmatically generated)
- Phone, 7-inch, and 10-inch screenshot mockup layouts (HTML/CSS, export-ready)
- Reusable Python generation scripts for fast iteration

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React Native, Expo SDK 55, Expo Router |
| State | Redux Toolkit |
| Backend | Firebase Auth, Firestore |
| Notifications | Expo Notifications |
| AI | OpenRouter API (GPT-4o / Claude) |
| Auth | Google Sign-In |
| Store Assets | Python (Pillow), HTML/CSS mockup system |

---

## Design System

Colors (from `constants/theme.ts`):
- Dark Navy `#355872` — primary text, buttons, frames
- Medium Blue `#7AAACE` — accents, secondary text, progress
- Light Blue `#9CD5FF` — highlights, chips, active states
- Off White `#F7F8F0` — light background, card surfaces
- Dark Background `#1A2E3D` — dark mode canvas

Typography: Space Grotesk (UI), system fallback (device)

---

## Suggested Tags / Skills
React Native · Expo · Firebase · TypeScript · Redux · Mobile App Development · iOS · Android · UI/UX Design · AI Integration · App Store Optimization

---

## Image Upload Order
1. `store-mockups/portfolio/portfolio-hero.png`  ← Hero
2. Your real app screenshot: Today screen
3. Your real app screenshot: History / Analytics
4. Your real app screenshot: AI Insights
5. Your real app screenshot: Reminders
6. `store-mockups/play-store/feature-graphic-1024x500.png`  ← Feature graphic
7. `store-mockups/play-store/app-icon-512.png`  ← Icon

---

## One-liner for bio / proposal
> Built and shipped Hydro: Gulp — a full-stack React Native hydration tracker with AI coaching, Firebase sync, push reminders, and complete Play Store listing. Clean code, beautiful UI, production-ready.
