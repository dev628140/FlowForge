
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
  handleAddTasks: (newTasks: Partial<Omit<Task, 'id' | 'completed' | 'userId'>>) => Promise<void>;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => Promise<void>;
  handleDeleteTask: (id: string, parentId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  handleReorderTask: (taskId: string, direction: 'up' | 'down') => Promise<void>;
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
        // Assign order if it's missing
        const tasksToUpdate: Task[] = [];
        const orderedTasks = userTasks
          .sort((a,b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
          .map((task, index) => {
            if (task.order === undefined || task.order === null) {
              const newTask = { ...task, order: index };
              tasksToUpdate.push(newTask);
              return newTask;
            }
            return task;
          });
        
        if (tasksToUpdate.length > 0) {
          const batch = writeBatch(db);
          tasksToUpdate.forEach(task => {
            const taskRef = doc(db, 'tasks', task.id);
            batch.update(taskRef, { order: task.order });
          });
          batch.commit().catch(e => console.error("Failed to set default order", e));
        }

        setTasks(orderedTasks);
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

    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) : -1;
    
    try {
      const batch = writeBatch(db);
      newTasks.forEach((task, index) => {
        const taskId = uuidv4();
        const taskRef = doc(db, 'tasks', taskId);
        
        const newTaskData: Omit<Task, 'subtasks'> = {
          id: taskId,
          userId: user.uid,
          completed: false,
          createdAt: new Date().toISOString(),
          title: task.title || 'Untitled Task',
          order: maxOrder + 1 + index,
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
        let parentTask: Task | null = null;
        let isSubtask = false;

        // Check if it's a subtask
        for (const task of tasks) {
            if (task.subtasks?.some(st => st.id === taskId)) {
                parentTask = task;
                isSubtask = true;
                break;
            }
        }

        if (isSubtask && parentTask) {
            // Handle subtask update
            const parentTaskRef = doc(db, 'tasks', parentTask.id);
            const updatedSubtasks = parentTask.subtasks!.map(st => 
                st.id === taskId ? { ...st, ...updates } : st
            );
            await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
        } else {
            // Handle main task update
            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, updates);
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
       
       const maxSubtaskOrder = parentTask.subtasks?.reduce((max, sub) => Math.max(sub.order || 0, max), 0) || 0;

       const newSubtasks: Task[] = subtasks.map((sub, index) => ({
          id: uuidv4(),
          title: sub.title,
          description: sub.description || '',
          completed: false,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          order: maxSubtaskOrder + index + 1
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

  const handleReorderTask = async (taskId: string, direction: 'up' | 'down') => {
    if (!user || !db) return;

    const sortedList = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sortedList.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;

    // Determine the list of tasks visible in the current view
    // This part is crucial for handling reordering within filtered lists
    const taskToMove = sortedList[currentIndex];
    const visibleTasks = taskToMove.scheduledDate ? tasks.filter(t => t.scheduledDate === taskToMove.scheduledDate) : tasks;
    const sortedVisibleList = visibleTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentVisibleIndex = sortedVisibleList.findIndex(t => t.id === taskId);

    const swapIndex = direction === 'up' ? currentVisibleIndex - 1 : currentVisibleIndex + 1;

    if (swapIndex < 0 || swapIndex >= sortedVisibleList.length) return;
    
    const taskToSwapWith = sortedVisibleList[swapIndex];

    const newOrderForMoved = taskToSwapWith.order;
    const newOrderForSwapped = taskToMove.order;

    const newTasks = tasks.map(t => {
      if (t.id === taskToMove.id) return { ...t, order: newOrderForMoved };
      if (t.id === taskToSwapWith.id) return { ...t, order: newOrderForSwapped };
      return t;
    });

    setTasks(newTasks);

    try {
      const batch = writeBatch(db);
      const movedTaskRef = doc(db, 'tasks', taskToMove.id);
      batch.update(movedTaskRef, { order: newOrderForMoved });
      const swappedTaskRef = doc(db, 'tasks', taskToSwapWith.id);
      batch.update(swappedTaskRef, { order: newOrderForSwapped });
      await batch.commit();
    } catch (error) {
      console.error("Error reordering tasks:", error);
      toast({ title: "Error", description: "Could not save the new order.", variant: "destructive" });
      setTasks(tasks); 
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
      updateTask,
      handleReorderTask
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
