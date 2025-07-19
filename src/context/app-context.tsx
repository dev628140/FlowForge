
'use client';

import * as React from 'react';
import type { Task, ChatSession, AssistantMessage, UserRole } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, writeBatch, query, where, onSnapshot, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { generateChatTitle } from '@/ai/flows/generate-chat-title-flow';
import { type GenerateChatTitleInput } from '@/lib/types/conversational-agent';
import { isToday, parseISO } from 'date-fns';

const USER_ROLE_STORAGE_KEY = 'flowforge_user_role';


interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  showConfetti: boolean;
  handleToggleTask: (id: string, parentId?: string) => Promise<void>;
  handleAddTasks: (newTasks: Partial<Omit<Task, 'id' | 'completed' | 'userId'>>[]) => Promise<void>;
  handleAddSubtasks: (parentId: string, subtasks: { title: string; description?: string }[]) => Promise<void>;
  handleDeleteTask: (id: string, parentId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  handleMoveTask: (taskId: string, direction: 'up' | 'down', list: Task[]) => Promise<void>;
  
  // Dashboard Chat Session Management
  chatSessions: ChatSession[];
  createChatSession: (history: AssistantMessage[]) => Promise<string>;
  updateChatSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
  deleteChatSession: (sessionId: string) => Promise<void>;
  
  // AI Hub Planner Sessions
  plannerSessions: ChatSession[];
  createPlannerSession: (history: AssistantMessage[]) => Promise<string>;
  updatePlannerSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
  deletePlannerSession: (sessionId: string) => Promise<void>;

  // AI Hub Breakdown Sessions
  breakdownSessions: ChatSession[];
  createBreakdownSession: (history: AssistantMessage[]) => Promise<string>;
  updateBreakdownSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
  deleteBreakdownSession: (sessionId: string) => Promise<void>;
  
  // AI Hub Suggester Sessions
  suggesterSessions: ChatSession[];
  createSuggesterSession: (history: AssistantMessage[]) => Promise<string>;
  updateSuggesterSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
  deleteSuggesterSession: (sessionId: string) => Promise<void>;


  // User Preferences
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

// Helper function to create a session manager
function createSessionManager(
  collectionName: string,
  user: any,
  toast: any
): [ChatSession[], (history: AssistantMessage[]) => Promise<string>, (sessionId: string, updates: Partial<ChatSession>) => Promise<void>, (sessionId: string) => Promise<void>] {
  
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);

  React.useEffect(() => {
    if (user && db) {
      const q = query(collection(db, collectionName), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userSessions: ChatSession[] = [];
        snapshot.forEach((doc) => userSessions.push({ id: doc.id, ...doc.data() } as ChatSession));
        setSessions(userSessions);
      }, (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        toast({ title: "Error", description: `Could not fetch ${collectionName}.`, variant: "destructive" });
      });
      return () => unsubscribe();
    } else {
      setSessions([]);
    }
  }, [user, toast, collectionName]);

  const createSession = async (history: AssistantMessage[]): Promise<string> => {
    if (!user || !db) throw new Error("User not authenticated.");
    
    const sessionId = uuidv4();
    const sessionRef = doc(db, collectionName, sessionId);
    
    const newSession: ChatSession = {
        id: sessionId,
        userId: user.uid, // Ensure userId is passed correctly
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        history,
        pinned: false,
    };
    
    // Create the session immediately with a default title
    await setDoc(sessionRef, newSession);

    // Then, asynchronously generate and update the title
    generateChatTitle({ history: history as GenerateChatTitleInput['history'] })
        .then(async ({ title }) => {
            if (title) {
                await updateDoc(sessionRef, { title });
            }
        })
        .catch(error => {
            console.warn("Could not generate chat title:", error);
            // The session is already created, so we just log the warning.
        });

    return sessionId;
  };

  const updateSession = async (sessionId: string, updates: Partial<ChatSession>) => {
    if (!user || !db) return;
    const sessionRef = doc(db, collectionName, sessionId);
    await updateDoc(sessionRef, updates);
  };

  const deleteSession = async (sessionId: string) => {
    if (!user || !db) return;
    const sessionRef = doc(db, collectionName, sessionId);
    await deleteDoc(sessionRef);
  };
  
  return [sessions, createSession, updateSession, deleteSession];
}


export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [userRole, setUserRole] = React.useState<UserRole>('Developer');

  // Session Management
  const [chatSessions, createChatSession, updateChatSession, deleteChatSession] = createSessionManager('chatSessions', user, toast);
  const [plannerSessions, createPlannerSession, updatePlannerSession, deletePlannerSession] = createSessionManager('plannerSessions', user, toast);
  const [breakdownSessions, createBreakdownSession, updateBreakdownSession, deleteBreakdownSession] = createSessionManager('breakdownSessions', user, toast);
  const [suggesterSessions, createSuggesterSession, updateSuggesterSession, deleteSuggesterSession] = createSessionManager('suggesterSessions', user, toast);


  React.useEffect(() => {
    const savedRole = localStorage.getItem(USER_ROLE_STORAGE_KEY) as UserRole;
    if (savedRole) {
      setUserRole(savedRole);
    }
  }, []);

  const handleSetUserRole = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
  };
  
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
        const tasksToUpdate: Task[] = [];
        const orderedTasks = userTasks
          .sort((a,b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
          .map((task, index) => {
            if (task.order === undefined || task.order === null) {
              const newTask = { ...task, order: (index + 1) * 1000 };
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

    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0).filter(o => isFinite(o))) : -1;
    
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
          order: maxOrder + 1000 + index * 1000,
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

        for (const task of tasks) {
            if (task.subtasks?.some(st => st.id === taskId)) {
                parentTask = task;
                isSubtask = true;
                break;
            }
        }

        if (isSubtask && parentTask) {
            const parentTaskRef = doc(db, 'tasks', parentTask.id);
            const updatedSubtasks = parentTask.subtasks!.map(st => 
                st.id === taskId ? { ...st, ...updates } : st
            );
            await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
        } else {
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
       
       const maxSubtaskOrder = parentTask.subtasks?.reduce((max, sub) => Math.max(sub.order || 0, max), -1) ?? -1;

       const newSubtasks: Task[] = subtasks.map((sub, index) => ({
          id: uuidv4(),
          title: sub.title,
          description: sub.description || '',
          completed: false,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          order: maxSubtaskOrder + 1000 + (index * 1000)
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

  const handleMoveTask = async (taskId: string, direction: 'up' | 'down', list: Task[]) => {
      if (!user || !db) return;
      
      const taskList = list.filter(t => !t.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
      const currentIndex = taskList.findIndex(t => t.id === taskId);

      if (currentIndex === -1) return; 

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= taskList.length) return;

      const currentTask = taskList[currentIndex];
      const targetTask = taskList[targetIndex];
      
      const newOrder =
        direction === 'up'
          ? (taskList[targetIndex - 1]?.order ?? targetTask.order! - 1000) / 2 + targetTask.order! / 2
          : (taskList[targetIndex + 1]?.order ?? targetTask.order! + 1000) / 2 + targetTask.order! / 2;

      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, order: newOrder } : t));

      try {
          const taskRef = doc(db, 'tasks', taskId);
          await updateDoc(taskRef, { order: newOrder });
      } catch (error) {
          console.error("Error reordering task:", error);
          toast({ title: "Error", description: "Could not save new order.", variant: "destructive" });
          setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, order: currentTask.order } : t));
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
      handleMoveTask,
      // Chat
      chatSessions,
      createChatSession,
      updateChatSession,
      deleteChatSession,
      // Planner
      plannerSessions,
      createPlannerSession,
      updatePlannerSession,
      deletePlannerSession,
      // Breakdown
      breakdownSessions,
      createBreakdownSession,
      updateBreakdownSession,
      deleteBreakdownSession,
      // Suggester
      suggesterSessions,
      createSuggesterSession,
      updateSuggesterSession,
      deleteSuggesterSession,
      // User Prefs
      userRole,
      setUserRole: handleSetUserRole,
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
