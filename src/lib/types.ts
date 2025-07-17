export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subtasks?: Task[];
}

export type UserRole = 'Student' | 'Developer' | 'Founder' | 'Freelancer';
