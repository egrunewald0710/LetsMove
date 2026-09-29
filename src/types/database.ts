export type Sport = 'swim' | 'bike' | 'run' | 'gym' | 'brick' | 'rest';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  ftp_watts: number | null;
  threshold_pace_run: string | null;
  css_pace_swim: string | null;
  max_hr: number | null;
  resting_hr: number | null;
  goal_race: string | null;
  goal_date: string | null;
  created_at: string;
};

export type WorkoutStep = {
  id: string;
  workout_id: string;
  order_index: number;
  label: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_intensity: string | null;
  repeat_count: number;
  notes: string | null;
};

export type Workout = {
  id: string;
  user_id: string;
  sport: Sport;
  title: string;
  scheduled_date: string | null;
  planned_duration_seconds: number | null;
  planned_distance_meters: number | null;
  notes: string | null;
  status: 'planned' | 'completed' | 'skipped';

  // Completed workout data
  actual_duration_seconds: number | null;
  actual_distance_meters: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  completion_notes: string | null;
  completed_at: string | null;

  created_at: string;
};

export type AiCoachConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AiCoachMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Race = {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  distance: string | null;
  location: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      workouts: {
        Row: Workout;
        Insert: Partial<Workout> & {
          user_id: string;
          sport: Sport;
          title: string;
          scheduled_date?: string | null;
        };
        Update: Partial<Workout>;
      };
      workout_steps: {
        Row: WorkoutStep;
        Insert: Partial<WorkoutStep> & {
          workout_id: string;
          order_index: number;
        };
        Update: Partial<WorkoutStep>;
      };
      ai_coach_conversations: {
        Row: AiCoachConversation;
        Insert: Partial<AiCoachConversation> & { user_id: string };
        Update: Partial<AiCoachConversation>;
      };
      ai_coach_messages: {
        Row: AiCoachMessage;
        Insert: Partial<AiCoachMessage> & {
          conversation_id: string;
          role: AiCoachMessage['role'];
          content: string;
        };
        Update: Partial<AiCoachMessage>;
      };
      races: {
        Row: Race;
        Insert: Partial<Race> & { user_id: string; name: string; event_date: string };
        Update: Partial<Race>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};