
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';
import { useAppContext } from '@/context/app-context';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onMove: (taskId: string, direction: 'up' | 'down') => void;
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
  onMove,
  isSubtaskList = false, 
  emptyMessage, 
  parentId,
  listId
}: TaskListProps) {
  
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0 && !isSubtaskList) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>{emptyMessage || "No tasks yet. Add one or use the AI planner!"}</p>
      </div>
    );
  }

  const renderTask = (task: Task, index: number, isCompletedList: boolean) => {
    const list = isCompletedList ? completedTasks : incompleteTasks;
    return (
      <TaskItem 
        key={`${listId}-${task.id}`}
        task={task} 
        onToggle={onToggle} 
        onStartFocus={onStartFocus}
        onUpdateTask={onUpdateTask}
        onMove={onMove}
        isFirst={index === 0}
        isLast={index === list.length - 1}
        isSubtask={isSubtaskList}
        parentId={parentId}
      />
    );
  };

  return (
    <div className="space-y-1">
      {incompleteTasks.map((task, index) => renderTask(task, index, false))}

      {completedTasks.length > 0 && incompleteTasks.length > 0 && !isSubtaskList && (
        <div className="text-xs font-semibold text-muted-foreground pt-4 pb-2">COMPLETED</div>
      )}

      {completedTasks.map((task, index) => renderTask(task, index, true))}
    </div>
  );
}
