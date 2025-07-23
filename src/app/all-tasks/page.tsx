
'use client';

import * as React from 'react';
import { ListTodo, Wand2, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from '@/components/dashboard/task-list';
import FocusMode from '@/components/dashboard/focus-mode';
import { format, parseISO, isToday, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { reorderAllTasks } from '@/ai/flows/reorder-all-tasks-flow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';


export default function AllTasksPage() {
  const { tasks, handleToggleTask, updateTask, handleMoveTask, setHasTaskOrderChanged, hasTaskOrderChanged } = useAppContext();
  
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [reorderingLoading, setReorderingLoading] = React.useState(false);
  const [lastReorderedDate, setLastReorderedDate] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });

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

  const onMove = (taskId: string, direction: 'up' | 'down', list: Task[], listId: string) => {
    handleMoveTask(taskId, direction, list);
    if(listId !== 'Unscheduled') {
      setLastReorderedDate(listId);
      setHasTaskOrderChanged(true);
    }
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

  const handleApplyOrderToRange = async () => {
    if (!lastReorderedDate) return;
    setReorderingLoading(true);

    try {
      const result = await reorderAllTasks({
        allTasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          order: t.order || 0,
          scheduledDate: t.scheduledDate,
        })),
        templateDate: lastReorderedDate,
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      });

      const updatePromises = result.updates.map(u => updateTask(u.taskId, u.updates));
      await Promise.all(updatePromises);
      
      toast({
        title: "Reordering Complete",
        description: `The task order has been applied to the selected date range.`,
      });

    } catch (error) {
      console.error("Failed to reorder tasks:", error);
      toast({
        title: "Reordering Failed",
        description: "Could not apply the new order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReorderingLoading(false);
      setHasTaskOrderChanged(false);
      setLastReorderedDate(null);
    }
  };


  return (
     <div className="relative min-h-screen w-full">
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <ListTodo className="w-8 h-8" />
                    All Tasks
                </h1>
                <p className="text-muted-foreground">Drag and drop tasks to reorder them for a specific day.</p>
              </div>

             {hasTaskOrderChanged && lastReorderedDate && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button disabled={reorderingLoading} className="w-full sm:w-auto">
                            {reorderingLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="mr-2 h-4 w-4" />
                            )}
                            Apply Order to Range
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Apply order to selected range?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will reorder tasks on all days in the selected range to match the relative order of titles from
                            <span className="font-bold"> {getGroupTitle(lastReorderedDate)}</span>. 
                            Tasks not on this date will be appended to the end. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApplyOrderToRange}>Apply to Range</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
             )}
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
                          onMove={(taskId, direction) => onMove(taskId, direction, groupTasks, groupKey)}
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
