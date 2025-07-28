
'use client';

import * as React from 'react';
import { ListTodo } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { format, parseISO, isToday } from 'date-fns';

export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleSwapTasks } = useAppContext();
  
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);

  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };
  
  const handleCompleteFocus = () => {
    if (focusTask) {
      handleToggleTask(focusTask.id);
    }
    setFocusTask(null);
  };

  const groupedTasks = React.useMemo(() => {
    const groups: { [key: string]: Task[] } = {};

    // First, sort all tasks by completion status, then date, then order
    const sortedTasks = [...tasks].sort((a, b) => {
        // Sort by completion status first (incomplete tasks first)
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // Then sort by scheduled date
        const dateA = a.scheduledDate ? parseISO(a.scheduledDate).getTime() : Infinity;
        const dateB = b.scheduledDate ? parseISO(b.scheduledDate).getTime() : Infinity;
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        // Finally, sort by order
        return (a.order || 0) - (b.order || 0);
    });

    sortedTasks.forEach(task => {
      const key = task.scheduledDate ? format(parseISO(task.scheduledDate), 'yyyy-MM-dd') : 'Unscheduled';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return groups;

  }, [tasks]);

  const getGroupTitle = (dateKey: string) => {
    if (dateKey === 'Unscheduled') return 'Unscheduled';
    const date = parseISO(dateKey);
    if (isToday(date)) return `Today, ${format(date, 'MMMM d')}`;
    return format(date, 'EEEE, MMMM d');
  }

  const groupKeys = Object.keys(groupedTasks).sort((a, b) => {
      if (a === 'Unscheduled') return 1;
      if (b === 'Unscheduled') return -1;
      return parseISO(a).getTime() - parseISO(b).getTime();
  });

  return (
     <div className="relative min-h-screen w-full">
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-down">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <ListTodo className="w-8 h-8" />
                    All Tasks
                </h1>
                <p className="text-muted-foreground">A complete list of all your tasks, organized by date.</p>
              </div>
            </div>
            
            {groupKeys.length === 0 && tasks.length === 0 ? (
                <Card className="animate-fade-in-up">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">You have no tasks yet. Go to the dashboard to add some!</p>
                    </CardContent>
                </Card>
             ) : groupKeys.map((groupKey, index) => {
              const groupTasks = groupedTasks[groupKey];
              return (
                <Card key={groupKey} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardHeader>
                        <CardTitle>{getGroupTitle(groupKey)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TaskList 
                          tasks={groupTasks} 
                          onToggle={handleToggleTask} 
                          onStartFocus={handleStartFocus} 
                          onUpdateTask={updateTask} 
                          onSwap={handleSwapTasks}
                          listId={groupKey}
                          emptyMessage="No tasks for this day." 
                        />
                    </CardContent>
                </Card>
              )
            })}
        </div>
        {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleCompleteFocus}/>}
    </div>
  );
}
