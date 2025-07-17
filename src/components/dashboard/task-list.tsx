'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onStartFocus: (task: Task) => void;
  isSubtaskList?: boolean;
}

export default function TaskList({ tasks, onToggle, onStartFocus, isSubtaskList = false }: TaskListProps) {
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0 && !isSubtaskList) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No tasks yet. Add one or use the AI planner!</p>
      </div>
    );
  }
  
  const renderTask = (task: Task) => (
    <TaskItem 
      key={task.id} 
      task={task} 
      onToggle={onToggle} 
      onStartFocus={onStartFocus} 
      isSubtask={isSubtaskList}
    />
  );

  return (
    <div className="space-y-1">
      {incompleteTasks.map(renderTask)}
      {completedTasks.length > 0 && incompleteTasks.length > 0 && !isSubtaskList && (
        <div className="text-xs font-semibold text-muted-foreground pt-4 pb-2">COMPLETED</div>
      )}
      {completedTasks.map(renderTask)}
    </div>
  );
}
