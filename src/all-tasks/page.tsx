
'use client';

import * as React from 'react';
import { ListTodo, ArrowDownUp } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { format, parseISO, compareAsc } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleReorderTask } = useAppContext();
  
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

  const tasksByDate = React.useMemo(() => {
    const groupedTasks: Record<string, Task[]> = {};

    tasks.forEach(task => {
        const dateKey = task.scheduledDate || 'Unscheduled';
        if (!groupedTasks[dateKey]) {
            groupedTasks[dateKey] = [];
        }
        groupedTasks[dateKey].push(task);
    });

    // Sort tasks within each group by their custom order
    for (const dateKey in groupedTasks) {
        groupedTasks[dateKey].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    return groupedTasks;
  }, [tasks]);

  const sortedDates = React.useMemo(() => {
    return Object.keys(tasksByDate).sort((a, b) => {
        if (a === 'Unscheduled') return 1;
        if (b === 'Unscheduled') return -1;
        return compareAsc(parseISO(a), parseISO(b));
    });
  }, [tasksByDate]);

  return (
     <div className="relative min-h-screen w-full">
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                  <ListTodo className="w-8 h-8" />
                  All Tasks
              </h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Your Tasks</CardTitle>
                    <CardDescription>A complete list of all your scheduled tasks, grouped by date.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {sortedDates.map((date, index) => {
                            const dailyTasks = tasksByDate[date];
                            const onReorderForDate = (taskId: string, direction: 'up' | 'down') => {
                                handleReorderTask(taskId, direction, dailyTasks);
                            };

                            return (
                                <div key={date}>
                                    <div className="mb-2">
                                        <h3 className="text-lg font-semibold font-headline">
                                            {date === 'Unscheduled' ? 'Unscheduled' : format(parseISO(date), 'EEEE, MMMM d')}
                                        </h3>
                                        <Separator className="mt-2"/>
                                    </div>
                                    <TaskList 
                                      tasks={dailyTasks} 
                                      onToggle={handleToggleTask} 
                                      onStartFocus={handleStartFocus} 
                                      onUpdateTask={updateTask} 
                                      onReorder={onReorderForDate}
                                      emptyMessage="No tasks for this day." 
                                    />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
        {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleCompleteFocus}/>}
    </div>
  );
}
