
'use client';

import * as React from 'react';
import { ListTodo, ArrowDownUp } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO, isToday } from 'date-fns';

type SortOption = 'scheduledDate' | 'createdAt-desc' | 'createdAt-asc' | 'title';

export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleMoveTask } = useAppContext();
  
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [sortBy, setSortBy] = React.useState<SortOption>('scheduledDate');

  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };
  
  const handleCompleteFocus = () => {
    if (focusTask) {
      handleToggleTask(focusTask.id);
    }
    setFocusTask(null);
  };

  const sortedTasks = React.useMemo(() => {
    const sortableTasks = [...tasks];
    return sortableTasks.sort((a, b) => {
      switch (sortBy) {
        case 'scheduledDate': {
          const dateA = a.scheduledDate ? parseISO(a.scheduledDate).getTime() : Infinity;
          const dateB = b.scheduledDate ? parseISO(b.scheduledDate).getTime() : Infinity;
          
          if (dateA !== dateB) {
            return dateA - dateB;
          }
          return (a.order || 0) - (b.order || 0);
        }
        case 'createdAt-desc':
            if (a.createdAt && b.createdAt) {
                return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
            }
            return 0;
        case 'createdAt-asc':
            if (a.createdAt && b.createdAt) {
                return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
            }
            return 0;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [tasks, sortBy]);

  const onMove = (taskId: string, direction: 'up' | 'down') => {
    const listId = sortBy === 'scheduledDate' 
      ? tasks.find(t => t.id === taskId)?.scheduledDate || 'unscheduled' 
      : 'all';
    handleMoveTask(taskId, direction, listId);
  };

  return (
     <div className="relative min-h-screen w-full">
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                  <ListTodo className="w-8 h-8" />
                  All Tasks
              </h1>
              <div className="flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortby(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduledDate">Scheduled Date</SelectItem>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Your Tasks</CardTitle>
                    <CardDescription>A complete list of all your scheduled tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TaskList 
                        tasks={sortedTasks} 
                        onToggle={handleToggleTask} 
                        onStartFocus={handleStartFocus} 
                        onUpdateTask={updateTask} 
                        onMove={onMove}
                        listId={sortBy === 'scheduledDate' ? 'byDate' : 'all'}
                        emptyMessage="No tasks found." 
                    />
                </CardContent>
            </Card>
        </div>
        {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleCompleteFocus}/>}
    </div>
  );
}
