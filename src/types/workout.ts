export type WorkoutType =
  | "Swim"
  | "Bike"
  | "Run"
  | "Strength"
  | "Brick"
  | "Recovery";

export interface Workout {
  id: string;

  title: string;
  type: WorkoutType;

  date: string;
  description?: string;

  plannedDuration?: number;
  plannedDistance?: number;

  plannedPace?: string;
  plannedHeartRate?: number;

  completed: boolean;

  // Actual workout data
  actualDuration?: number;
  actualDistance?: number;
  actualPace?: string;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;

  notes?: string;

  completedAt?: string;
}