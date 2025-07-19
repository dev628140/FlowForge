
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
  order?: number;
}

export type UserRole = 'Student' | 'Developer' | 'Founder' | 'Freelancer';

export type MoodLabel = 'High Energy' | 'Motivated' | 'Calm' | 'Stressed' | 'Low Energy';

export interface Mood {
  emoji: string;
  label: MoodLabel;
}

// New type for AI Assistant Messages
export interface AssistantMessage {
    role: 'user' | 'model';
    content: string;
}

// New type for Chat Sessions
export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: string; // ISO 8601 timestamp
    history: AssistantMessage[];
    pinned: boolean;
}
