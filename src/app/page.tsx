'use client';

import * as React from 'react';
import { PlusCircle, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import AITaskPlanner from '@/components/dashboard/ai-task-planner';
import RoleProductivity from '@/components/dashboard/role-productivity';
import TaskList from '@/components/dashboard/task-list';
import MoodTracker from '@/components/dashboard/mood-tracker';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Confetti from '@/components/confetti';
import FocusMode from '@/components/dashboard/focus-mode';

const getInitialTasks = (): Task[] => [
  { id: uuidv4(), title: 'Set up project structure', completed: true, description: 'Initialize Next.js app and install dependencies.' },
  { id: uuidv4(), title: 'Design the UI layout', completed: true, description: 'Create wireframes and mockups for the dashboard.' },
  { id: uuidv4(), title: 'Develop the TaskList component', completed: false, description: 'Build the main component to display tasks.' },
  { id: uuidv4(), title: 'Integrate AI task planning', completed: false, description: 'Connect the natural language processing flow.' },
  { id: uuidv4(), title: 'Implement dopamine rewards', completed: false, description: 'Add confetti and XP for task completion.' },
];

export default function DashboardPage() {
  const [tasks, setTasks] = React.useState<Task[]>(getInitialTasks);
  const [xp, setXp] = React.useState(20);
  const [level, setLevel] = React.useState(1);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [focusTask, setFocusTask] = React.useState<Task | null>(null);

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
  
  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
  };

  return (
    <div className="relative min-h-screen w-full">
      <Confetti active={showConfetti} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Tasks</CardTitle>
              <Button size="sm" variant="ghost">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              <TaskList tasks={tasks} onToggle={handleToggleTask} onStartFocus={handleStartFocus} />
            </CardContent>
          </Card>
          <AITaskPlanner onAddTasks={handleAddTasks} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <MoodTracker />
          <RoleProductivity />
        </div>
      </div>
      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => {
        handleToggleTask(focusTask.id)
        setFocusTask(null)
      }}/>}
    </div>
  );
}
