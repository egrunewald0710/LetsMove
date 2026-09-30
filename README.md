**# LetsMove App Overview**

LetsMove is a mobile training companion for triathlon and endurance athletes. It brings an athlete's training schedule, workouts, race goals, and coaching conversations into one place. The app is built with React Native and Expo, with Supabase providing authentication and cloud data storage.

**## Who It Is For**

LetsMove is designed for athletes who want to plan consistent swim, bike, run, strength, brick, and recovery sessions. Athletes can use the app on iOS or Android, review their progress, and stay connected with an assigned coach.

**## Athlete Experience**

\- **\*\*Home dashboard:\*\*** See today's planned sessions, the upcoming week, and progress toward a goal race.

\- **\*\*Training calendar:\*\*** Browse scheduled sessions by date and sport, and add workouts to the plan.

\- **\*\*Workout builder:\*\*** Create sessions with a sport, duration, notes, and interval steps.

\- **\*\*Workout library:\*\*** Find and review completed training sessions.

\- **\*\*Analysis:\*\*** Review completed training time, distance, and sport mix.

\- **\*\*Race calendar:\*\*** Track upcoming events and countdowns.

\- **\*\*Reminders:\*\*** Opt in to local reminders for planned workout days.

\- **\*\*Athlete profile:\*\*** Keep training zones and goal-race information together, including bike FTP, run threshold pace, swim CSS, and heart-rate values.

**## Coaching**

LetsMove includes two distinct coaching experiences:

\- **\*\*AI endurance coach:\*\*** Ask training questions, review supported training files, and generate workouts or structured plans.

\- **\*\*Assigned coach chat:\*\*** From the Coach Marketplace, athletes can see coaches with an active assignment and open a private conversation. The app checks the logged-in athlete's assignment in Supabase. Messages and read receipts are stored in \`coach_messages\`; row-level security limits access to the assigned coach and athlete.

The coach backend also supports assigned coaches reading an athlete's planned workouts and creating or editing planned training. Completed workout data remains athlete-owned.

**## Marketplace Status**

The marketplace screen currently shows sample coach-built training plans for browsing. The assigned-coach section is separate from those sample listings: it only displays coaches connected to the signed-in athlete through an active Supabase assignment.

**## Data and Access**

Supabase Auth identifies the signed-in user. Supabase Row Level Security policies restrict access to each user's data and enforce coach-athlete assignment rules for shared workouts and messages. The mobile app uses the Supabase anon public key; privileged service-role credentials must never be included in the app.

**## Technology**

\- React Native and Expo

\- TypeScript

\- Supabase Auth, Postgres, Row Level Security, and Realtime

\- Supabase Edge Functions for AI coaching workflows



Create a document to investors about this app.

include admin side and messages and everything