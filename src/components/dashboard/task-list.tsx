
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onReorder?: (taskId: string, direction: 'up' | 'down', contextTasks: Task[]) => void;
  isSubtaskList?: boolean;
  emptyMessage?: string;
  parentId?: string;
}

export default function TaskList({ tasks, onToggle, onStartFocus, onUpdateTask, onReorder, isSubtaskList = false, emptyMessage, parentId }: TaskListProps) {
  
  const handleReorder = (taskId: string, direction: 'up' | 'down') => {
    if (onReorder) {
      onReorder(taskId, direction, tasks);
    }
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0 && !isSubtaskList) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>{emptyMessage || "No tasks yet. Add one or use the AI planner!"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {incompleteTasks.map((task, index) => (
        <TaskItem 
          key={task.id} 
          task={task} 
          onToggle={onToggle} 
          onStartFocus={onStartFocus}
          onUpdateTask={onUpdateTask}
          onReorder={!isSubtaskList ? (taskId, direction) => handleReorder(taskId, direction) : undefined}
          isFirst={index === 0}
          isLast={index === incompleteTasks.length - 1}
          isSubtask={isSubtaskList}
          parentId={parentId}
        />
      ))}

      {completedTasks.length > 0 && incompleteTasks.length > 0 && !isSubtaskList && (
        <div className="text-xs font-semibold text-muted-foreground pt-4 pb-2">COMPLETED</div>
      )}

      {completedTasks.map((task, index) => (
        <TaskItem 
          key={task.id} 
          task={task} 
          onToggle={onToggle} 
          onStartFocus={onStartFocus}
          onUpdateTask={onUpdateTask}
          isSubtask={isSubtaskList}
          parentId={parentId}
        />
      ))}
    </div>
  );
}
