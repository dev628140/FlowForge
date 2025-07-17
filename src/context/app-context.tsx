
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, writeBatch, query, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, isBefore, isToday, startOfToday, parseISO } from 'date-fns';

interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  xp: number;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  showConfetti: boolean;
  handleToggleTask: (id: string, parentId?: string) => Promise<void>;
  handleAddTasks: (newTasks: Partial<Omit<Task, 'id' | 'completed' | 'userId'>>[]) => Promise<void>;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => Promise<void>;
  handleDeleteTask: (id: string, parentId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

const XP_PER_LEVEL = 50;
const XP_PENALTY_PER_DAY = 5;
const LAST_PENALTY_CHECK_KEY = 'lastPenaltyCheck';

const countTasks = (allTasks: Task[]) => {
  let active = 0;
  let completed = 0;
  allTasks.forEach(task => {
    if (task.completed) {
      completed++;
    } else {
      active++;
    }
    if (task.subtasks) {
      const subtaskCounts = countTasks(task.subtasks);
      active += subtaskCounts.active;
      completed += subtaskCounts.completed;
    }
  });
  return { active, completed };
};

const calculateTotalXp = (allTasks: Task[]): number => {
  const { active, completed } = countTasks(allTasks);
  const totalTasks = active + completed;

  if (totalTasks === 0) {
    return 0;
  }

  // If 5 or fewer tasks, 10xp per completed task.
  if (totalTasks <= 5) {
    return completed * 10;
  }

  // If more than 5 tasks, use proportional XP.
  const xpPerTask = XP_PER_LEVEL / totalTasks;
  return Math.round(completed * xpPerTask);
};


export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [totalXp, setTotalXp] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);
  
  // Derived state for level and current XP
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xp = totalXp % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL;

  // Listen for task changes in Firestore
  React.useEffect(() => {
    if (user && db) {
      const q = query(
        collection(db, "tasks"), 
        where("userId", "==", user.uid)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          userTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(userTasks);
        setTotalXp(calculateTotalXp(userTasks));
      }, (error) => {
        console.error("Error listening to tasks:", error);
        toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
      });
      
      return () => unsubscribe();
    } else {
      setTasks([]);
      setTotalXp(0);
    }
  }, [user, toast]);
  
  // Effect to save totalXp to localStorage
  React.useEffect(() => {
    if (user) {
      localStorage.setItem(`totalXp_${user.uid}`, totalXp.toString());
    }
  }, [totalXp, user]);

  // Effect for daily penalty check
  React.useEffect(() => {
    if (!user || tasks.length === 0) return;

    const lastCheckString = localStorage.getItem(LAST_PENALTY_CHECK_KEY);
    const today = startOfToday();

    if (lastCheckString && isToday(parseISO(lastCheckString))) {
      return;
    }

    const overdueTasks = tasks.filter(task => 
        !task.completed && 
        task.scheduledDate && 
        isBefore(parseISO(task.scheduledDate), today)
    );

    if (overdueTasks.length > 0) {
        let totalPenalty = 0;
        overdueTasks.forEach(task => {
            const daysOverdue = differenceInDays(today, parseISO(task.scheduledDate!));
            if (daysOverdue > 0) {
                totalPenalty += daysOverdue * XP_PENALTY_PER_DAY;
            }
        });

        if (totalPenalty > 0) {
            setTotalXp(currentXp => {
                const newXp = Math.max(0, currentXp - totalPenalty);
                 toast({
                    title: "XP Penalty Applied",
                    description: `You lost ${totalPenalty} XP for overdue tasks.`,
                    variant: 'destructive'
                });
                return newXp;
            });
        }
    }

    localStorage.setItem(LAST_PENALTY_CHECK_KEY, today.toISOString());

  }, [tasks, user, toast]);

  const handleToggleTask = async (id: string, parentId?: string) => {
    if (!user || !db) return;

    let taskToToggle: Task | null = null;
    let parentTask: Task | null = null;
    let localTasks = [...tasks];

    if (parentId) {
      parentTask = localTasks.find(t => t.id === parentId) || null;
      if (parentTask && parentTask.subtasks) {
        taskToToggle = parentTask.subtasks.find(t => t.id === id) || null;
      }
    } else {
      taskToToggle = localTasks.find(t => t.id === id) || null;
    }

    if (!taskToToggle) return;

    const isCompleting = !taskToToggle.completed;

    try {
      const batch = writeBatch(db);
      
      const updateData: Partial<Task> = {
        completed: isCompleting,
      };
      if (isCompleting) {
        updateData.completedAt = new Date().toISOString();
      }

      if (parentTask) {
        const parentTaskRef = doc(db, 'tasks', parentId);
        const updatedSubtasks = parentTask.subtasks?.map(sub => 
            sub.id === id ? { ...sub, ...updateData } : sub
        );
        batch.update(parentTaskRef, { subtasks: updatedSubtasks });
      } else {
        const taskRef = doc(db, 'tasks', id);
        batch.update(taskRef, updateData);
      }
      
      await batch.commit();

      if (isCompleting) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      // Firestore listener will automatically update state and recalculate XP.

    } catch (error) {
      console.error("Error toggling task:", error);
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    }
  };
  
  const handleAddTasks = async (newTasks: Partial<Omit<Task, 'id' | 'completed' | 'userId'>>[]) => {
    if (!user || !db) return;
    
    try {
      const batch = writeBatch(db);
      newTasks.forEach(task => {
        const taskId = uuidv4();
        const taskRef = doc(db, 'tasks', taskId);
        
        const newTaskData: Omit<Task, 'subtasks'> = {
          id: taskId,
          userId: user.uid,
          completed: false,
          createdAt: new Date().toISOString(),
          title: task.title || 'Untitled Task',
        };

        if (task.description) {
          newTaskData.description = task.description;
        }
        if (task.scheduledDate) {
          newTaskData.scheduledDate = task.scheduledDate;
        }
        if (task.scheduledTime) {
          newTaskData.scheduledTime = task.scheduledTime;
        }

        batch.set(taskRef, newTaskData);
      });
      await batch.commit();
      // Firestore listener will update state.
    } catch (error) {
       console.error("Error adding tasks:", error);
       toast({ title: "Error", description: "Could not add tasks.", variant: "destructive" });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user || !db) return;
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
      // Firestore listener will update state.
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

       const newSubtasks: Task[] = subtasks.map(sub => ({
          id: uuidv4(),
          title: sub.title,
          description: sub.description || '',
          completed: false,
          userId: user.uid,
          createdAt: new Date().toISOString(),
       }));

       const updatedSubtasks = [...(parentTask.subtasks || []), ...newSubtasks];
       await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
       // Firestore listener will update state.
       
     } catch (error) {
       console.error("Error adding subtasks:", error);
       toast({ title: "Error", description: "Could not add subtasks.", variant: "destructive" });
     }
  };
  
  const handleDeleteTask = async (id: string, parentId?: string) => {
    if (!user || !db) return;
    try {
      if (parentId) {
        const parentTaskRef = doc(db, 'tasks', parentId);
        const docSnap = await getDoc(parentTaskRef);

        if (!docSnap.exists()) {
            throw new Error("Parent task not found");
        }
        const parentTask = docSnap.data() as Task;
        const updatedSubtasks = parentTask.subtasks?.filter(sub => sub.id !== id);
        await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
      } else {
        const taskRef = doc(db, 'tasks', id);
        await deleteDoc(taskRef);
      }
      // Firestore listener will update state.
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  return (
    <AppContext.Provider value={{
      tasks, setTasks,
      xp,
      totalXp,
      level,
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
