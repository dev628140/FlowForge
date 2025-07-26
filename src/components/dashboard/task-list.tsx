
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onSwap: (taskA: Task, taskB: Task) => Promise<void>;
  isSubtaskList?: boolean;
  emptyMessage?: string;
  parentId?: string;
  listId: string; // Unique identifier for this list's context
}

export default function TaskList({ 
  tasks, 
  onToggle, 
  onStartFocus, 
  onUpdateTask,
  onSwap,
  isSubtaskList = false, 
  emptyMessage, 
  parentId,
  listId
}: TaskListProps) {
  
  if (tasks.length === 0 && !isSubtaskList) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>{emptyMessage || "No tasks yet. Add one or use the AI planner!"}</p>
      </div>
    );
  }

  const renderTask = (task: Task, index: number) => {
    const neighborUp = index > 0 ? tasks[index - 1] : undefined;
    const neighborDown = index < tasks.length - 1 ? tasks[index + 1] : undefined;

    return (
      <TaskItem 
        key={`${listId}-${task.id}`}
        task={task} 
        onToggle={onToggle} 
        onStartFocus={onStartFocus}
        onUpdateTask={onUpdateTask}
        onSwap={onSwap}
        isSubtask={isSubtaskList}
        parentId={parentId}
        neighborUp={neighborUp}
        neighborDown={neighborDown}
      />
    );
  };

  return (
    <div className="space-y-1">
      {tasks.map((task, index) => renderTask(task, index))}
    </div>
  );
}
