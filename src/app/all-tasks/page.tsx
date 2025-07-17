
'use client';

import * as React from 'react';
import { ListTodo } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';

export default function AllTasksPage() {
  const { 
    tasks, 
    handleToggleTask,
  } = useAppContext();
  
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

  const unscheduledTasks = tasks.filter(task => !task.scheduledDate);
  const scheduledTasks = tasks.filter(task => task.scheduledDate);

  return (
     <div className="relative min-h-screen w-full">
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <ListTodo className="w-8 h-8" />
                All Tasks
            </h1>
            
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
