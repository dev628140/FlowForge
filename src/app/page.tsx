'use client';

import * as React from 'react';
import { PlusCircle, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function DashboardPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isClient, setIsClient] = React.useState(false);
  const [xp, setXp] = React.useState(0);
  const [level, setLevel] = React.useState(1);
  const [showConfetti, setShowConfetti] = React.useState(false);
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
    const initialTasksData = [
      { id: uuidv4(), title: 'Set up project structure', completed: true, description: 'Initialize Next.js app and install dependencies.' },
      { id: uuidv4(), title: 'Design the UI layout', completed: true, description: 'Create wireframes and mockups for the dashboard.' },
      { id: uuidv4(), title: 'Develop the TaskList component', completed: false, description: 'Build the main component to display tasks.' },
      { id: uuidv4(), title: 'Integrate AI task planning', completed: false, description: 'Connect the natural language processing flow.' },
      { id: uuidv4(), title: 'Implement dopamine rewards', completed: false, description: 'Add confetti and XP for task completion.' },
    ];
    setTasks(initialTasksData);
    setXp(initialTasksData.filter(t => t.completed).length * 10);
  }, []);

  const xpToNextLevel = level * 50;

  React.useEffect(() => {
    if (xp >= xpToNextLevel) {
      setLevel(prev => prev + 1);
      setXp(prev => prev - xpToNextLevel);
    }
  }, [xp, xpToNextLevel]);
  
  const handleToggleTask = (id: string) => {
    let isCompleting = false;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === id) {
          if (!task.completed) {
            isCompleting = true;
          }
          return { ...task, completed: !task.completed };
        }
        return task;
      })
    );

    if (isCompleting) {
      new Audio('/sounds/success.mp3').play().catch(e => console.error("Audio play failed", e));
      setShowConfetti(true);
      setXp(prev => prev + 10);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleAddTasks = (newTasks: { title: string; description?: string }[]) => {
    const tasksToAdd: Task[] = newTasks.map(task => ({
      id: uuidv4(),
      title: task.title,
      description: task.description || '',
      completed: false,
    }));
    setTasks(prev => [...tasksToAdd, ...prev]);
  };

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
          <ProgressJournal tasks={tasks} />
        </div>
      </div>
      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => {
        handleToggleTask(focusTask.id)
        setFocusTask(null)
      }}/>}
    </div>
  );
}
