# LetsMove — MVP

A triathlon/endurance training app: auth, athlete profile & training zones,
a training calendar, and a swim/bike/run/gym workout builder with an
interval editor. Built with **React Native + Expo** and **Supabase**.

This covers the Month 1 MVP (auth, profile, calendar, workout builder) and
an AI endurance coach for questions, training-file review, and workout
creation. Strava sync, coach marketplace, and payments remain future work.

## 1. Set up Supabase (5 minutes)

1. Go to https://supabase.com, create a free project.
2. In the dashboard, open **SQL Editor** → **New Query**.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.
  This creates the profile, workout, race, and AI chat tables,
   turns on Row Level Security so users can only see their own data, and
   adds a trigger that auto-creates a profile row when someone signs up.
4. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key.

## 2. Plug in your Supabase credentials — do this

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and paste your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

That's it — `src/lib/supabase.ts` reads these automatically. (If you'd
rather not use a `.env` file, you can hardcode the two strings directly
near the top of `src/lib/supabase.ts` instead — it's clearly marked.)

Use the **anon public** key only. Never put the `service_role` secret
key in the app.

## 3. Install and run

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app (iOS/Android), or press `i` / `a`
to open a simulator, or `w` for web.

## What's included

- **Auth** — email/password sign up & login via Supabase Auth
  (`src/screens/auth`, `src/contexts/AuthContext.tsx`)
- **Profile & zones** — name, goal race, FTP (bike), threshold pace
  (run), CSS pace (swim), max/resting HR (`src/screens/ProfileScreen.tsx`)
- **Training calendar** — month view with dots per sport, tap a day to
  see/add workouts (`src/screens/CalendarScreen.tsx`)
- **Workout builder** — pick a sport, set total duration in hours and minutes,
  and save workouts to Supabase
  (`src/screens/WorkoutBuilderScreen.tsx`)
- **Home dashboard** — today's workouts + next 7 days
  (`src/screens/HomeScreen.tsx`)
- **Race calendar** — manage upcoming events and countdowns
  (`src/screens/RaceScreen.tsx`)
- **Workout library** — search and filter completed sessions
  (`src/screens/WorkoutLibraryScreen.tsx`)
- **Analysis** — review completed workout time, distance, and sport mix
  (`src/screens/AnalysisScreen.tsx`)
- **Workout reminders** — opt-in 8:00 AM local alerts on planned workout days
  (`src/lib/workoutReminders.ts`)
- **AI endurance coach** — persistent chat, training-file review, workout
  creation, and structured plans through authenticated Supabase Edge Functions

### Configure AI features

For an existing database, run `supabase/migrations/20260928_ai_coach_chat.sql`
and `supabase/migrations/20260928_races.sql` in the Supabase SQL Editor. Add
`OPENROUTER_API_KEY` as a Supabase Edge
Function secret in the Dashboard. Do not put provider keys in `.env` or
prefix them with `EXPO_PUBLIC_`; those values are included in the client app.
Link the project with the Supabase CLI, then deploy both functions:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy generate-training-plan
npx supabase functions deploy triathlon-coach
```

The coach accepts PDF, text, Markdown, CSV, JSON, JPEG, PNG, and WebP files
up to 3 MB total per message. File contents are sent to OpenRouter for that
request; chat history stores message text and attachment names, not raw files.

## Database schema

```
profiles        — one row per user: zones, goal race, etc.
workouts        — planned sessions: sport, date, title, status
workout_steps   — interval rows belonging to a workout (order, duration,
                   distance, target intensity, repeat count)
races           — upcoming events owned by each user
ai_coach_conversations — private chat threads owned by each user
ai_coach_messages      — private chat messages and workout suggestions
```

All application tables have Row Level Security enabled so users can only
read or write their own rows.

## Next steps (from your original plan)

- **Strava sync** — OAuth against Strava's API, store `activities` linked
  to `workouts` to compare planned vs. actual.
- **Coach marketplace** — add `coaches`, `chats`, `messages`, `reviews`
  tables; a coach role that can write to an athlete's calendar.
- **Subscriptions** — Stripe + Supabase Edge Functions for webhooks.
- **Push reminders** — `expo-notifications` for "workout today" alerts.

- [x] Fix the home screen hours trained have it take the hourse and sync it.
- [x] Progress bar and race day.
- [x] Fix the top part being stuck to the top.
- [x] Change workout builder to total hours and minutes.
- [x] Add a library for previously completed workouts.


- [x] Display the workout for the day.
- [ ] Get sleep metrics from the device health app.
- [ ] Connect Garmin to auto-upload workouts.
- [x] Add an analysis button to navigation.
  - the analysis page will take activities and do analysis on them for athletes to review and their coaches. 
- [x] Add a separate race page for upcoming races.
- **Coach marketplace** — add `coaches`, `chats`, `messages`, `reviews`
  tables; a coach role that can write to an athlete's calendar.
- **Subscriptions** — Stripe + Supabase Edge Functions for webhooks.
- **Push reminders** — `expo-notifications` for "workout today" alerts. 

AI
- AI endurance chat now supports questions, file review, and workout creation.
- **Strava sync** — OAuth against Strava's API, store `activities` linked
  to `workouts` to compare planned vs. actual.
- **Coach marketplace** — add `coaches`, `chats`, `messages`, `reviews`
  tables; a coach role that can write to an athlete's calendar.
- **Subscriptions** — Stripe + Supabase Edge Functions for webhooks.
- **Push reminders** — `expo-notifications` for "workout today" alerts.