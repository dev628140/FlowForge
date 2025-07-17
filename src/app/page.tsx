
'use client';

import * as React from 'react';
import { PlusCircle, Zap, Calendar as CalendarIcon, AlertTriangle, Trash2, LayoutDashboard } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/context/app-context';
import { format, isToday, parseISO, isBefore, startOfToday, differenceInDays } from 'date-fns';

import AITaskPlanner from '@/components/dashboard/ai-task-planner';
import RoleProductivity from '@/components/dashboard/role-productivity';
import TaskList from '@/components/dashboard/task-list';
import MoodTracker from '@/components/dashboard/mood-tracker';
import type { Task, Mood } from '@/lib/types';
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
import ProgressJournal from '@/components/dashboard/progress-journal';
import ProductivityDNATracker from '@/components/dashboard/productivity-dna-tracker';
import VisualTaskSnap from '@/components/dashboard/visual-task-snap';
import LearningPlanner from '@/components/dashboard/learning-planner';
import { useAuth } from '@/context/auth-context';
import { Icons } from '@/components/icons';
import DynamicSuggestions from '@/components/dashboard/dynamic-suggestions';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const generalTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  scheduledDate: z.date({ required_error: 'A date is required.' }),
  scheduledTime: z.string().optional(),
});
type GeneralTaskFormValues = z.infer<typeof generalTaskFormSchema>;

const todayTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
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
  } = useAppContext();

  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);
  const [isGeneralAddDialogOpen, setIsGeneralAddDialogOpen] = React.useState(false);
  const [isTodayAddDialogOpen, setIsTodayAddDialogOpen] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState<Mood | null>({ emoji: '😊', label: 'Motivated' });

  const generalForm = useForm<GeneralTaskFormValues>({
    resolver: zodResolver(generalTaskFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const todayForm = useForm<TodayTaskFormValues>({
    resolver: zodResolver(todayTaskFormSchema),
    defaultValues: { title: '', description: '', scheduledDate: new Date() },
  });
  
  const handleGeneralAddTaskSubmit = (values: GeneralTaskFormValues) => {
    handleAddTasks([{ 
      title: values.title, 
      description: values.description,
      scheduledDate: format(values.scheduledDate, 'yyyy-MM-dd'),
      scheduledTime: values.scheduledTime || undefined,
    }]);
    generalForm.reset();
    setIsGeneralAddDialogOpen(false);
  };
  
  const handleTodayAddTaskSubmit = (values: TodayTaskFormValues) => {
    handleAddTasks([{ 
      title: values.title, 
      description: values.description,
      scheduledDate: format(values.scheduledDate || new Date(), 'yyyy-MM-dd'),
      scheduledTime: values.scheduledTime || undefined,
    }]);
    todayForm.reset({ title: '', description: '', scheduledDate: new Date() });
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

  const todaysTasks = tasks.filter(task => task.scheduledDate && isToday(parseISO(task.scheduledDate)));
  const overdueTasks = tasks.filter(task => 
    !task.completed && 
    task.scheduledDate && 
    isBefore(parseISO(task.scheduledDate), startOfToday())
  );

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
          <Dialog open={isGeneralAddDialogOpen} onOpenChange={setIsGeneralAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
              <Form {...generalForm}>
                <form
                  onSubmit={generalForm.handleSubmit(handleGeneralAddTaskSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={generalForm.control}
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
                    control={generalForm.control}
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
                  <div className="flex gap-4">
                     <FormField
                        control={generalForm.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col w-1/2">
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
                          control={generalForm.control}
                          name="scheduledTime"
                          render={({ field }) => (
                            <FormItem className="w-1/2">
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-6 h-6" />
                Today's Tasks
              </CardTitle>
              <CardDescription>Tasks scheduled for {format(new Date(), "MMMM d")}.</CardDescription>
            </div>
            <Dialog open={isTodayAddDialogOpen} onOpenChange={setIsTodayAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add for Today
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a task for today</DialogTitle>
                    <DialogDescription>
                      This task will be automatically scheduled for today. You can optionally add a time.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...todayForm}>
                    <form
                      onSubmit={todayForm.handleSubmit(handleTodayAddTaskSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={todayForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Go for a 30-min walk" {...field} />
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
                              <Textarea
                                placeholder="Add any extra details..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="flex gap-4">
                        <FormField
                            control={todayForm.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col w-1/2">
                                <FormLabel>Date (optional)</FormLabel>
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
                              control={todayForm.control}
                              name="scheduledTime"
                              render={({ field }) => (
                                <FormItem className="w-1/2">
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
          </CardHeader>
          <CardContent>
            <TaskList tasks={todaysTasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} onUpdateTask={updateTask} emptyMessage="No tasks for today. Add one to get started!" />
          </CardContent>
        </Card>
        
        {overdueTasks.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                Pending Tasks
              </CardTitle>
              <CardDescription>Tasks that are past their due date.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdueTasks.map(task => {
                  const daysOverdue = differenceInDays(startOfToday(), parseISO(task.scheduledDate!));
                  return (
                     <div key={task.id} className={cn("flex items-start group p-2 rounded-md hover:bg-muted/50 transition-colors")}>
                        <div className="flex-1">
                          <span className={cn("font-medium transition-colors", task.completed ? "text-muted-foreground line-through" : "text-card-foreground")}>
                            {task.title}
                          </span>
                          <p className="text-xs text-destructive">
                            {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Due today'}
                          </p>
                        </div>
                        <div className={cn("flex items-center transition-opacity", "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AITaskPlanner />
          <DynamicSuggestions />
          <MoodTracker selectedMood={selectedMood} onSelectMood={setSelectedMood} />
          <RoleProductivity mood={selectedMood?.label || 'Neutral'} />
          <VisualTaskSnap onAddTasks={handleAddTasks} />
          <LearningPlanner />
          <ProgressJournal tasks={tasks} />
          <ProductivityDNATracker tasks={tasks} />
        </div>
      </div>
      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => {
        handleToggleTask(focusTask.id)
        setFocusTask(null)
      }}/>}
    </div>
  );
}
