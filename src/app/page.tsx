'use client';

import * as React from 'react';
import { PlusCircle, Zap } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/context/app-context';

import AITaskPlanner from '@/components/dashboard/ai-task-planner';
import RoleProductivity from '@/components/dashboard/role-productivity';
import TaskList from '@/components/dashboard/task-list';
import MoodTracker from '@/components/dashboard/mood-tracker';
import type { Task, Mood } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    setTasks,
    setXp
  } = useAppContext();

  const [isClient, setIsClient] = React.useState(false);
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

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleAddTaskSubmit = (values: TaskFormValues) => {
    handleAddTasks([{ title: values.title, description: values.description }]);
    form.reset();
    setIsAddDialogOpen(false);
  };
  
  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full">
      <Confetti active={showConfetti} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Tasks</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a new task</DialogTitle>
                    <DialogDescription>
                      What do you want to accomplish?
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
              <TaskList tasks={tasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} />
            </CardContent>
          </Card>
          <AITaskPlanner onAddTasks={handleAddTasks} />
        </div>
        <div className="lg:col-span-1 space-y-6">
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
