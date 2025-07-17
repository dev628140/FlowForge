
'use client';

import * as React from 'react';
import { ListTodo, ArrowDownUp } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO } from 'date-fns';

type SortOption = 'scheduledDate' | 'createdAt-desc' | 'createdAt-asc' | 'title';

export default function AllTasksPage() {
  const { tasks, handleToggleTask } = useAppContext();
  
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
        case 'scheduledDate':
          if (a.scheduledDate && b.scheduledDate) {
            return parseISO(a.scheduledDate).getTime() - parseISO(b.scheduledDate).getTime();
          }
          if (a.scheduledDate) return -1; // a comes first
          if (b.scheduledDate) return 1;  // b comes first
          // if neither have a scheduled date, sort by creation
          if (a.createdAt && b.createdAt) {
            return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
          }
          return 0;
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

  const unscheduledTasks = sortedTasks.filter(task => !task.scheduledDate);
  const scheduledTasks = sortedTasks.filter(task => task.scheduledDate);

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
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Scheduled</CardTitle>
                        <CardDescription>Tasks that have an assigned date.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TaskList tasks={scheduledTasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} emptyMessage="No scheduled tasks." />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Inbox / Unscheduled</CardTitle>
                        <CardDescription>Tasks that need to be scheduled.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TaskList tasks={unscheduledTasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} emptyMessage="Your inbox is clear!" />
                    </CardContent>
                </Card>
            </div>
        </div>
        {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleCompleteFocus}/>}
    </div>
  );
}
