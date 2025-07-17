export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subtasks?: Task[];
  completedAt?: string;
  scheduledDate?: string; // YYYY-MM-DD
  userId: string;
  createdAt?: string;
  ownerEmail?: string;
  sharedWith?: string[]; // Array of user emails
}

export type UserRole = 'Student' | 'Developer' | 'Founder' | 'Freelancer';

export type MoodLabel = 'High Energy' | 'Neutral' | 'Low Energy' | 'Motivated' | 'Calm' | 'Stressed';

export interface Mood {
  emoji: string;
  label: MoodLabel;
}
