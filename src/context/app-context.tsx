
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  xpToNextLevel: number;
  showConfetti: boolean;
  handleToggleTask: (id: string, parentId?: string) => void;
  handleAddTasks: (newTasks: Partial<Omit<Task, 'id' | 'completed' | 'userId'>>[]) => Promise<void>;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => Promise<void>;
  handleDeleteTask: (id: string, parentId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [xp, setXp] = React.useState(0);
  const [level, setLevel] = React.useState(1);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const xpToNextLevel = level * 50;

  // Listen for task changes in Firestore
  React.useEffect(() => {
    if (user && db) {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          userTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(userTasks);
      }, (error) => {
        console.error("Error listening to tasks:", error);
        toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
      });

      return () => unsubscribe();
    } else {
      setTasks([]); // Clear tasks if user logs out
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (xp >= xpToNextLevel) {
      setLevel(prev => prev + 1);
      setXp(prev => prev - xpToNextLevel);
    }
  }, [xp, xpToNextLevel]);
  
  const handleToggleTask = async (id: string, parentId?: string) => {
    if (!user || !db) return;
    
    let taskToToggle: Task | null = null;
    let parentTask: Task | null = null;
    
    if (parentId) {
      parentTask = findTaskById(tasks, parentId);
      if (parentTask && parentTask.subtasks) {
        taskToToggle = parentTask.subtasks.find(t => t.id === id) || null;
      }
    } else {
      taskToToggle = findTaskById(tasks, id);
    }

    if (!taskToToggle) return;

    const isCompleting = !taskToToggle.completed;

    try {
      const batch = writeBatch(db);

      if (parentTask) {
        const parentTaskRef = doc(db, 'tasks', parentId);
        const updatedSubtasks = parentTask.subtasks?.map(sub => 
          sub.id === id 
            ? { ...sub, completed: isCompleting, completedAt: isCompleting ? new Date().toISOString() : undefined } 
            : sub
        );
        batch.update(parentTaskRef, { subtasks: updatedSubtasks });
      } else {
        const taskRef = doc(db, 'tasks', id);
        batch.update(taskRef, { 
          completed: isCompleting,
          completedAt: isCompleting ? new Date().toISOString() : undefined,
        });
      }
      
      await batch.commit();

      if (isCompleting) {
        new Audio('/sounds/success.mp3').play().catch(e => console.error("Audio play failed", e));
        setShowConfetti(true);
        setXp(prev => prev + 10);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    }
  };
  
  const handleAddTasks = async (newTasks: Partial<Omit<Task, 'id' | 'completed'>>[]) => {
    if (!user || !db) return;
    
    try {
      const batch = writeBatch(db);
      newTasks.forEach(task => {
        const taskId = uuidv4();
        const taskRef = doc(db, 'tasks', taskId);
        batch.set(taskRef, {
          ...task,
          id: taskId,
          userId: user.uid,
          completed: false,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    } catch (error) {
       console.error("Error adding tasks:", error);
       toast({ title: "Error", description: "Could not add tasks.", variant: "destructive" });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user || !db) return;
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const batch = writeBatch(db);
      batch.update(taskRef, updates);
      await batch.commit();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    }
  };

  const handleAddSubtasks = async (parentId: string, subtasks: { title: string; description?: string }[]) => {
     if (!user || !db) return;
     try {
       const parentTaskRef = doc(db, 'tasks', parentId);
       const docSnap = await getDoc(parentTaskRef);

       if (!docSnap.exists()) {
         throw new Error("Parent task not found");
       }
       const parentTask = docSnap.data() as Task;

       const batch = writeBatch(db);
       
       const newSubtasks: Task[] = subtasks.map(sub => ({
          id: uuidv4(),
          title: sub.title,
          description: sub.description || '',
          completed: false,
          userId: user.uid,
          createdAt: new Date().toISOString(),
       }));

       const updatedSubtasks = [...(parentTask.subtasks || []), ...newSubtasks];
       batch.update(parentTaskRef, { subtasks: updatedSubtasks });

       await batch.commit();
     } catch (error) {
       console.error("Error adding subtasks:", error);
       toast({ title: "Error", description: "Could not add subtasks.", variant: "destructive" });
     }
  };
  
  const handleDeleteTask = async (id: string, parentId?: string) => {
    if (!user || !db) return;
    try {
      const batch = writeBatch(db);
      
      if (parentId) {
        // This is a subtask, update the parent
        const parentTaskRef = doc(db, 'tasks', parentId);
        const docSnap = await getDoc(parentTaskRef);

        if (!docSnap.exists()) {
            throw new Error("Parent task not found");
        }
        const parentTask = docSnap.data() as Task;
        const updatedSubtasks = parentTask.subtasks?.filter(sub => sub.id !== id);
        batch.update(parentTaskRef, { subtasks: updatedSubtasks });
      } else {
        // This is a main task, delete the document
        const taskRef = doc(db, 'tasks', id);
        batch.delete(taskRef);
      }
      
      await batch.commit();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  const findTaskById = (tasks: Task[], id: string): Task | null => {
    for (const task of tasks) {
      if (task.id === id) return task;
      if (task.subtasks) {
        const found = findTaskById(task.subtasks, id);
        if (found) return found;
      }
    }
    return null;
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
