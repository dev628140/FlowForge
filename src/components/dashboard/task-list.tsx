
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import TaskItem from './task-item';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onReorder: (taskId: string, direction: 'up' | 'down') => void;
  isSubtaskList?: boolean;
  emptyMessage?: string;
  parentId?: string;
}

export default function TaskList({ tasks, onToggle, onStartFocus, onUpdateTask, onReorder, isSubtaskList = false, emptyMessage, parentId }: TaskListProps) {
  
  // The `tasks` prop is already sorted by the parent component.
  // We no longer need to sort it here.
  const sortedTasks = tasks;

  const incompleteTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);

  if (tasks.length === 0 && !isSubtaskList) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>{emptyMessage || "No tasks yet. Add one or use the AI planner!"}</p>
      </div>
    );
  }
  
  const renderTasks = (tasksToRender: Task[], isCompletedList: boolean) => {
    return tasksToRender.map((task, index) => {
      const isFirstInList = index === 0;
      const isLastInList = index === tasksToRender.length - 1;

      // Determine if the task is the very first or very last in the *visible* list.
      const isFirstOverall = !isCompletedList && isFirstInList;
      const isLastOverall = (isCompletedList && isLastInList) || (!completedTasks.length && !isCompletedList && isLastInList);

      return (
        <TaskItem 
          key={task.id} 
          task={task} 
          onToggle={onToggle} 
          onStartFocus={onStartFocus}
          onUpdateTask={onUpdateTask}
          onReorder={onReorder}
          isSubtask={isSubtaskList}
          parentId={parentId}
          isFirst={isFirstOverall}
          isLast={isLastOverall}
        />
      )
    });
  }

  return (
    <div className="space-y-1">
      {renderTasks(incompleteTasks, false)}
      {completedTasks.length > 0 && incompleteTasks.length > 0 && !isSubtaskList && (
        <div className="text-xs font-semibold text-muted-foreground pt-4 pb-2">COMPLETED</div>
      )}
      {renderTasks(completedTasks, true)}
    </div>
  );
}
