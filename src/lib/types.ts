export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subtasks?: Task[];
  completedAt?: string;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  userId: string;
  createdAt?: string;
}

export type UserRole = 'Student' | 'Developer' | 'Founder' | 'Freelancer';

export type MoodLabel = 'High Energy' | 'Motivated' | 'Calm' | 'Stressed' | 'Low Energy';

export interface Mood {
  emoji: string;
  label: MoodLabel;
}

    