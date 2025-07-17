
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, writeBatch, query, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  showConfetti: boolean;
  handleToggleTask: (id: string, parentId?: string) => Promise<void>;
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
  const [showConfetti, setShowConfetti] = React.useState(false);
  
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
      }, (error) => {
        console.error("Error listening to tasks:", error);
        toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
      });
      
      return () => unsubscribe();
    } else {
      setTasks([]);
    }
  }, [user, toast]);

  const handleToggleTask = async (id: string, parentId?: string) => {
    if (!user || !db) return;

    let taskToToggle: Task | null = null;
    let parentTask: Task | null = null;

    if (parentId) {
      parentTask = tasks.find(t => t.id === parentId) || null;
      if (parentTask && parentTask.subtasks) {
        taskToToggle = parentTask.subtasks.find(t => t.id === id) || null;
      }
    } else {
      taskToToggle = tasks.find(t => t.id === id) || null;
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
    } catch (error) {
       console.error("Error adding tasks:", error);
       toast({ title: "Error", description: "Could not add tasks.", variant: "destructive" });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user || !db) return;
    try {
        // Find the task, whether it's a main task or a subtask
        let taskFound = false;
        const newTasks = tasks.map(t => {
            if (t.id === taskId) {
                taskFound = true;
                return { ...t, ...updates };
            }
            if (t.subtasks) {
                let subtaskUpdated = false;
                const newSubtasks = t.subtasks.map(st => {
                    if (st.id === taskId) {
                        subtaskUpdated = true;
                        return { ...st, ...updates };
                    }
                    return st;
                });
                if (subtaskUpdated) {
                    taskFound = true;
                    return { ...t, subtasks: newSubtasks };
                }
            }
            return t;
        });

        if (taskFound) {
            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, updates);
        } else {
             console.warn("Task to update not found in main tasks, checking subtasks...");
             // This part handles updating subtasks that might be nested
             for (const task of tasks) {
                 if (task.subtasks?.some(st => st.id === taskId)) {
                     const parentTaskRef = doc(db, 'tasks', task.id);
                     const updatedSubtasks = task.subtasks.map(st => st.id === taskId ? {...st, ...updates} : st);
                     await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
                     break;
                 }
             }
        }
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
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  return (
    <AppContext.Provider value={{
      tasks, setTasks,
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
