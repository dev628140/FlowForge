
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

type SortOption = 'order' | 'scheduledDate' | 'createdAt-desc' | 'createdAt-asc' | 'title';

const SORT_ORDER_STORAGE_KEY = 'flowforge_all_tasks_sort_order';

export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleReorderTask } = useAppContext();
  
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [sortBy, setSortBy] = React.useState<SortOption>('order');
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const savedSortOrder = localStorage.getItem(SORT_ORDER_STORAGE_KEY) as SortOption;
    if (savedSortOrder) {
      setSortBy(savedSortOrder);
    }
  }, []);

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    if (isClient) {
      localStorage.setItem(SORT_ORDER_STORAGE_KEY, value);
    }
  };

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
        case 'order':
          return (a.order ?? Infinity) - (b.order ?? Infinity);

        case 'scheduledDate':
          const dateA = a.scheduledDate ? parseISO(a.scheduledDate).getTime() : Infinity;
          const dateB = b.scheduledDate ? parseISO(b.scheduledDate).getTime() : Infinity;
          
          if (dateA !== dateB) {
            return dateA - dateB;
          }
          return (a.order ?? Infinity) - (b.order ?? Infinity);

        case 'createdAt-desc':
          const timeA_desc = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
          const timeB_desc = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
          return timeB_desc - timeA_desc;

        case 'createdAt-asc':
          const timeA_asc = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
          const timeB_asc = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
          return timeA_asc - timeB_asc;

        case 'title':
          return a.title.localeCompare(b.title);

        default:
          return 0;
      }
    });
  }, [tasks, sortBy]);


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
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Priority</SelectItem>
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
                        allTasks={tasks}
                        onToggle={handleToggleTask} 
                        onStartFocus={handleStartFocus} 
                        onUpdateTask={updateTask} 
                        onReorder={handleReorderTask} 
                        emptyMessage="No tasks found."
                    />
                </CardContent>
            </Card>
        </div>
        {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleCompleteFocus}/>}
    </div>
  );
}
