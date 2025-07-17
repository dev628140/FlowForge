
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  xpToNextLevel: number;
  showConfetti: boolean;
  handleToggleTask: (id: string) => void;
  handleAddTasks: (newTasks: { title: string; description?: string }[]) => void;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [xp, setXp] = React.useState(0);
  const [level, setLevel] = React.useState(1);
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    const initialTasks: Task[] = [
      { id: uuidv4(), title: 'Set up project structure', completed: true, description: 'Initialize Next.js app and install dependencies.', completedAt: new Date().toISOString() },
      { 
        id: uuidv4(), 
        title: 'Design the UI layout', 
        completed: true, 
        description: 'Create wireframes and mockups for the dashboard.',
        completedAt: new Date().toISOString(),
        subtasks: [
          { id: uuidv4(), title: 'Wireframe main dashboard', completed: true, completedAt: new Date().toISOString() },
          { id: uuidv4(), title: 'Choose color palette', completed: true, completedAt: new Date().toISOString() },
        ]
      },
      { id: uuidv4(), title: 'Develop the TaskList component', completed: false, description: 'Build the main component to display tasks.' },
      { id: uuidv4(), title: 'Integrate AI task planning', completed: false, description: 'Connect the natural language processing flow.' },
      { id: uuidv4(), title: 'Implement dopamine rewards', completed: false, description: 'Add confetti and XP for task completion.' },
    ];
    setTasks(initialTasks);
    
    const calculateInitialXp = (tasks: Task[]): number => {
      let totalXp = 0;
      tasks.forEach(task => {
        if (task.completed) {
          totalXp += 10;
        }
        if (task.subtasks) {
          totalXp += calculateInitialXp(task.subtasks);
        }
      });
      return totalXp;
    };
    setXp(calculateInitialXp(initialTasks));
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

    const toggleRecursively = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        if (task.id === id) {
          if (!task.completed) {
            isCompleting = true;
          }
          const isNowCompleted = !task.completed;
          return { 
            ...task, 
            completed: isNowCompleted,
            completedAt: isNowCompleted ? new Date().toISOString() : undefined
          };
        }
        if (task.subtasks) {
          return { ...task, subtasks: toggleRecursively(task.subtasks) };
        }
        return task;
      });
    };
    
    setTasks(prevTasks => toggleRecursively(prevTasks));

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

  const handleAddSubtasks = (parentId: string, subtasks: { title: string; description?: string }[]) => {
    const newSubtasks: Task[] = subtasks.map(sub => ({
      id: uuidv4(),
      title: sub.title,
      description: sub.description || '',
      completed: false,
    }));

    const addRecursively = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        if (task.id === parentId) {
          const existingSubtasks = task.subtasks || [];
          return { ...task, subtasks: [...existingSubtasks, ...newSubtasks] };
        }
        if (task.subtasks) {
          return { ...task, subtasks: addRecursively(task.subtasks) };
        }
        return task;
      });
    };

    setTasks(prevTasks => addRecursively(prevTasks));
  };


  return (
    <AppContext.Provider value={{
      tasks, setTasks,
      xp, setXp,
      level, setLevel,
      xpToNextLevel,
      showConfetti,
      handleToggleTask,
      handleAddTasks,
      handleAddSubtasks
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
