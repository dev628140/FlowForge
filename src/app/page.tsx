
'use client';

import * as React from 'react';
import { PlusCircle, Zap, Calendar, AlertTriangle, Trash2 } from 'lucide-react';
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

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

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
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState<Mood | null>({ emoji: '😊', label: 'Motivated' });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });
  
  const handleAddTaskSubmit = (values: TaskFormValues) => {
    handleAddTasks([{ 
      title: values.title, 
      description: values.description,
    }]);
    form.reset();
    setIsAddDialogOpen(false);
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
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Today's Tasks
              </CardTitle>
              <CardDescription>Tasks scheduled for {format(new Date(), "MMMM d")}.</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="mt-4 sm:mt-0">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new task</DialogTitle>
                  <DialogDescription>
                    What do you want to accomplish? This task will be added to your inbox.
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
            <TaskList tasks={todaysTasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} onUpdateTask={updateTask} emptyMessage="No tasks for today. Enjoy your break or schedule some!" />
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
