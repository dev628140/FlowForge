
'use client';

import * as React from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { autoSchedule } from '@/ai/flows/auto-schedule-flow';

export default function SchedulePage() {
    const { tasks, updateTask } = useAppContext();
    const { toast } = useToast();
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [loading, setLoading] = React.useState(false);

    const weekStartsOn = 1; // Monday
    const selectedWeekStart = date ? startOfWeek(date, { weekStartsOn }) : new Date();

    const handleAutoSchedule = async () => {
        setLoading(true);
        try {
            const unscheduledTasks = tasks.filter(t => !t.completed && !t.scheduledDate);
            if (unscheduledTasks.length === 0) {
                toast({
                    title: 'No Unscheduled Tasks',
                    description: 'All your tasks are already on the schedule.',
                });
                return;
            }

            const result = await autoSchedule({
                tasks: unscheduledTasks.map(t => ({ id: t.id, title: t.title, description: t.description })),
                startDate: format(selectedWeekStart, 'yyyy-MM-dd'),
            });

            if (result.schedule) {
                 const batchUpdates = result.schedule.map(scheduledTask => {
                    return updateTask(scheduledTask.taskId, { scheduledDate: scheduledTask.date });
                 });
                 await Promise.all(batchUpdates);
                toast({
                    title: 'Schedule Generated!',
                    description: 'Your tasks have been scheduled for the week.',
                });
            }
        } catch (error) {
            console.error("Error auto-scheduling tasks:", error);
            toast({
                title: 'Scheduling Failed',
                description: 'Could not generate a schedule. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    const tasksByDate = React.useMemo(() => {
        const groups = tasks.reduce((acc, task) => {
            if (task.scheduledDate) {
                const dateStr = format(new Date(task.scheduledDate), 'yyyy-MM-dd');
                if (!acc[dateStr]) {
                    acc[dateStr] = [];
                }
                acc[dateStr].push(task);
            }
            return acc;
        }, {} as Record<string, Task[]>);

        // Sort tasks within each day by their order property
        for (const date in groups) {
            groups[date].sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        return groups;
    }, [tasks]);
    
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(selectedWeekStart, i));

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline mb-1">Weekly Schedule</h1>
                    <p className="text-muted-foreground">View and manage your tasks for the week. Only unscheduled tasks will be added.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[280px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleAutoSchedule} disabled={loading} className="w-full sm:w-auto">
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Auto-Schedule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {weekDays.map(day => (
                    <Card key={day.toString()} className="h-full flex flex-col">
                        <CardHeader className="p-4">
                            <CardTitle className="text-sm font-medium">{format(day, 'EEE')}</CardTitle>
                            <CardDescription className="text-xs">{format(day, 'MMM d')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex-grow">
                            <div className="space-y-2">
                                {tasksByDate[format(day, 'yyyy-MM-dd')]?.map(task => (
                                    <div key={task.id} className={cn("text-xs p-2 rounded-md bg-muted text-muted-foreground", task.completed && "line-through opacity-50")}>
                                        {task.title}
                                    </div>
                                )) || <p className="text-xs text-muted-foreground/50">No tasks.</p>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
