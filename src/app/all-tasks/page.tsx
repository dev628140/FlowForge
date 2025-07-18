
'use client';

import * as React from 'react';
import { ListTodo, ArrowDownUp } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';

type GroupOption = 'byDate' | 'byStatus';

export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleMoveTask } = useAppContext();
  
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [groupBy, setGroupBy] = React.useState<GroupOption>('byDate');

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

    const sortedByDate = [...tasks].sort((a, b) => {
      const dateA = a.scheduledDate ? parseISO(a.scheduledDate).getTime() : Infinity;
      const dateB = b.scheduledDate ? parseISO(b.scheduledDate).getTime() : Infinity;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return (a.order || 0) - (b.order || 0);
    });

    sortedByDate.forEach(task => {
      const key = task.scheduledDate ? format(parseISO(task.scheduledDate), 'yyyy-MM-dd') : 'Unscheduled';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    for (const key in groups) {
      groups[key].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return groups;

  }, [tasks]);

  const onMove = (taskId: string, direction: 'up' | 'down', list: Task[]) => {
    handleMoveTask(taskId, direction, list);
  };

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                  <ListTodo className="w-8 h-8" />
                  All Tasks
              </h1>
            </div>
            
            {groupKeys.map(groupKey => {
              const groupTasks = groupedTasks[groupKey];
              return (
                <Card key={groupKey}>
                    <CardHeader>
                        <CardTitle>{getGroupTitle(groupKey)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TaskList 
                          tasks={groupTasks} 
                          onToggle={handleToggleTask} 
                          onStartFocus={handleStartFocus} 
                          onUpdateTask={updateTask} 
                          onMove={(taskId, direction) => onMove(taskId, direction, groupTasks)}
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
