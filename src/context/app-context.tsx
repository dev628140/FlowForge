
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

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
  handleAddTasks: (newTasks: Partial<Omit<Task, 'id' | 'completed'>>[]) => void;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => void;
  handleDeleteTask: (id: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [xp, setXp] = React.useState(0);
  const [level, setLevel] = React.useState(1);
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    // Start with an empty list of tasks
    setTasks([]);
    setXp(0);
    setLevel(1);
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
  
  const handleAddTasks = (newTasks: Partial<Omit<Task, 'id' | 'completed'>>[]) => {
    const tasksToAdd: Task[] = newTasks.map(task => ({
      id: uuidv4(),
      title: task.title || 'Untitled Task',
      description: task.description || '',
      completed: false,
      scheduledDate: task.scheduledDate,
    }));
    setTasks(prev => [...tasksToAdd, ...prev]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updateRecursively = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, ...updates };
        }
        if (task.subtasks) {
          return { ...task, subtasks: updateRecursively(task.subtasks) };
        }
        return task;
      });
    };
    setTasks(prevTasks => updateRecursively(prevTasks));
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
  
  const handleDeleteTask = (id: string) => {
    const deleteRecursively = (tasks: Task[], taskId: string): Task[] => {
      return tasks.filter(task => {
        if (task.id === taskId) {
          return false;
        }
        if (task.subtasks) {
          task.subtasks = deleteRecursively(task.subtasks, taskId);
        }
        return true;
      });
    };

    setTasks(prevTasks => deleteRecursively(prevTasks, id));
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
      handleAddSubtasks,
      handleDeleteTask,
      updateTask
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
