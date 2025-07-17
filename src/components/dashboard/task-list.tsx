'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onStartFocus: (task: Task) => void;
}

export default function TaskList({ tasks, onToggle, onStartFocus }: TaskListProps) {
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No tasks yet. Add one or use the AI planner!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {incompleteTasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onStartFocus={onStartFocus} />
      ))}
      {completedTasks.length > 0 && incompleteTasks.length > 0 && (
        <div className="text-xs font-semibold text-muted-foreground pt-4 pb-2">COMPLETED</div>
      )}
      {completedTasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onStartFocus={onStartFocus} />
      ))}
    </div>
  );
}
