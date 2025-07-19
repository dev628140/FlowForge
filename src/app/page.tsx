
'use client';

import * as React from 'react';
import { PlusCircle, LayoutDashboard, Calendar as CalendarIcon, AlertTriangle, Trash2, CalendarPlus, Wand2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/context/app-context';
import { format, isToday, parseISO, isBefore, startOfToday, differenceInDays } from 'date-fns';

import TaskList from '@/components/dashboard/task-list';
import type { Task, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Confetti from '@/components/confetti';
import FocusMode from '@/components/dashboard/focus-mode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DailyProgressBar from '@/components/dashboard/daily-progress-bar';
import { Badge } from '@/components/ui/badge';
import DynamicSuggestionCard from '@/components/dashboard/dynamic-suggestion-card';
import { Label } from '@/components/ui/label';
import AIAssistant from '@/components/dashboard/ai-assistant';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

const todayTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
});
type TodayTaskFormValues = z.infer<typeof todayTaskFormSchema>;

export default function DashboardPage() {
  const { 
    tasks, 
    showConfetti, 
    handleToggleTask, 
    handleAddTasks,
    handleDeleteTask,
    updateTask,
    handleMoveTask,
    userRole,
    setUserRole,
  } = useAppContext();

  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isTodayAddDialogOpen, setIsTodayAddDialogOpen] = React.useState(false);
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const todayForm = useForm<TodayTaskFormValues>({
    resolver: zodResolver(todayTaskFormSchema),
    defaultValues: { title: "", description: "" },
  });
  
  const handleAddTaskSubmit = (values: TaskFormValues) => {
    handleAddTasks([{ 
      title: values.title, 
      description: values.description,
      scheduledDate: values.scheduledDate ? format(values.scheduledDate, 'yyyy-MM-dd') : undefined,
      scheduledTime: values.scheduledTime || undefined,
    }]);
    form.reset({ title: '', description: '' });
    setIsAddDialogOpen(false);
  };
  
  const handleAddTodayTaskSubmit = (values: TodayTaskFormValues) => {
    handleAddTasks([{
      ...values,
      scheduledDate: format(new Date(), "yyyy-MM-dd"),
    }]);
    todayForm.reset();
    setIsTodayAddDialogOpen(false);
  };

  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };

  const onDelete = async (task: Task) => {
    await handleDeleteTask(task.id);
    toast({
      title: 'Task deleted',
      description: `"${task.title}" has been permanently removed.`,
    });
  }
  
  const onReschedule = async (task: Task) => {
    await updateTask(task.id, { scheduledDate: format(new Date(), 'yyyy-MM-dd') });
    toast({
      title: 'Task Rescheduled',
      description: `"${task.title}" has been moved to today.`,
    });
  }

  const todaysTasks = React.useMemo(() => tasks.filter(task => task.scheduledDate && isToday(parseISO(task.scheduledDate))).sort((a,b) => (a.order || 0) - (b.order || 0)), [tasks]);
  
  const overdueTasks = tasks.filter(task => 
    !task.completed && 
    task.scheduledDate && 
    isBefore(parseISO(task.scheduledDate), startOfToday())
  ).sort((a, b) => parseISO(a.scheduledDate!).getTime() - parseISO(b.scheduledDate!).getTime());
  
  const userRoles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];

  if (authLoading) {
     return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.logo className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      <Confetti active={showConfetti} />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-3xl font-bold font-headline flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            Dashboard
          </CardTitle>
           <div className="flex items-center gap-2">
              <Label htmlFor="user-role-select" className="text-sm font-medium">Your Role:</Label>
              <Select value={userRole} onValueChange={(role: UserRole) => setUserRole(role)}>
                    <SelectTrigger id="user-role-select" className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
              </Select>
          </div>
        </div>
        
        <div className="flex flex-col gap-6">
            <DailyProgressBar tasks={todaysTasks} />
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6" />
                    Today's Tasks
                    </CardTitle>
                    <CardDescription>Tasks scheduled for {format(new Date(), "MMMM d")}.</CardDescription>
                </div>
                <div className="flex items-stretch flex-col sm:flex-row sm:items-center gap-2">
                    <Dialog open={isTodayAddDialogOpen} onOpenChange={setIsTodayAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add for Today
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add a task for today</DialogTitle>
                            <DialogDescription>
                            This task will be scheduled for today.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...todayForm}>
                            <form
                            onSubmit={todayForm.handleSubmit(handleAddTodayTaskSubmit)}
                            className="space-y-4"
                            >
                            <FormField
                                control={todayForm.control}
                                name="title"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                    <Input placeholder="e.g., Go for a run" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={todayForm.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                    <Textarea placeholder="Add any extra details..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">Add Task</Button>
                            </DialogFooter>
                            </form>
                        </Form>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Add a new task</DialogTitle>
                        <DialogDescription>
                            What do you want to accomplish? Add it to your schedule.
                        </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleAddTaskSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Read a chapter of a book" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Description (optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                    placeholder="Add any extra details..."
                                    {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <div className="flex flex-col sm:flex-row gap-4">
                            <FormField
                                control={form.control}
                                name="scheduledDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col flex-1">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarPicker
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scheduledTime"
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Time (optional)</FormLabel>
                                        <FormControl>
                                        <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Add Task</Button>
                            </DialogFooter>
                        </form>
                        </Form>
                    </DialogContent>
                    </Dialog>
                </div>
                </CardHeader>
                <CardContent>
                <TaskList
                    tasks={todaysTasks}
                    onToggle={handleToggleTask} 
                    onStartFocus={handleStartFocus} 
                    onUpdateTask={updateTask} 
                    onMove={(taskId, direction) => handleMoveTask(taskId, direction, todaysTasks)}
                    listId="today"
                    emptyMessage="No tasks for today. Add one to get started!" 
                />
                </CardContent>
            </Card>

             <DynamicSuggestionCard tasks={todaysTasks} role={userRole} />
            
            {overdueTasks.length > 0 && (
                <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-destructive">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Pending Tasks
                    </div>
                    <Badge variant="destructive">{overdueTasks.length}</Badge>
                    </CardTitle>
                    <CardDescription>Tasks that are past their due date.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                    {overdueTasks.map(task => {
                        const daysOverdue = differenceInDays(startOfToday(), parseISO(task.scheduledDate!));
                        return (
                        <div key={task.id} className={cn("flex items-center group p-2 rounded-md hover:bg-muted/50 transition-colors")}>
                            <div className="flex-1">
                                <span className={cn("font-medium text-card-foreground")}>
                                {task.title}
                                </span>
                                <p className="text-xs text-destructive">
                                {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Due today'}
                                </p>
                            </div>
                            <div className={cn("flex items-center transition-opacity", "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-primary/10 hover:text-primary"
                                    aria-label={`Reschedule task ${task.title}`}
                                    onClick={() => onReschedule(task)}
                                >
                                    <CalendarPlus className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Delete task ${task.title}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the task "{task.title}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(task)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        )
                    })}
                    </div>
                </CardContent>
                </Card>
            )}

            <AIAssistant allTasks={tasks} role={userRole} />
        </div>
      </div>

      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => {
        if(focusTask) handleToggleTask(focusTask.id)
        setFocusTask(null)
      }}/>}
    </div>
  );
}
