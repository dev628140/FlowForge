
'use client';

import * as React from 'react';
import { PlusCircle, Zap, Calendar } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/context/app-context';
import { format, isToday, parseISO } from 'date-fns';

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
  } = useAppContext();

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
    const today = format(new Date(), 'yyyy-MM-dd');
    handleAddTasks([{ 
      title: values.title, 
      description: values.description,
      scheduledDate: today 
    }]);
    form.reset();
    setIsAddDialogOpen(false);
  };
  
  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };

  const todaysTasks = tasks.filter(task => task.scheduledDate && isToday(parseISO(task.scheduledDate)));

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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 md:p-6">
        <div className="lg:col-span-3 space-y-6">
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
                    <DialogTitle>Add a new task for today</DialogTitle>
                    <DialogDescription>
                      What do you want to accomplish? This will be automatically scheduled for today.
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
                                placeholder="Add any extra details for the AI to summarize..."
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
              <TaskList tasks={todaysTasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} emptyMessage="No tasks for today. Enjoy your break or schedule some!" />
            </CardContent>
          </Card>

          <AITaskPlanner />
          <LearningPlanner />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <DynamicSuggestions />
          <MoodTracker selectedMood={selectedMood} onSelectMood={setSelectedMood} />
          <RoleProductivity mood={selectedMood?.label || 'Neutral'} />
          <VisualTaskSnap onAddTasks={handleAddTasks} />
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
