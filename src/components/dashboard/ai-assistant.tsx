
'use client';

import * as React from 'react';
import { Wand2, Loader2, Sparkles, AlertTriangle, Check, X, PlusCircle, RefreshCcw, Trash2, Bot, User, CornerDownLeft, MessageSquarePlus, Pin, PinOff, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import type { Task, UserRole, AssistantMessage, ChatSession } from '@/lib/types';
import { runAssistant, type AssistantOutput, type AssistantInput } from '@/ai/flows/assistant-flow';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface AIAssistantProps {
  allTasks: Task[];
  role: UserRole;
}

export default function AIAssistant({ allTasks, role }: AIAssistantProps) {
  const { 
    handleAddTasks, 
    updateTask, 
    handleDeleteTask, 
    handleAddSubtasks,
    chatSessions,
    createChatSession,
    updateChatSession,
    deleteChatSession,
  } = useAppContext();
  
  const { toast } = useToast();
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aiPlan, setAiPlan] = React.useState<AssistantOutput | null>(null);
  const isOffline = useOfflineStatus();
  
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<AssistantMessage[]>([]);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const isNewChat = activeChatId === null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);


  // Effect to load a chat session's history when it becomes active
  React.useEffect(() => {
    if (activeChatId) {
      const activeSession = chatSessions.find(s => s.id === activeChatId);
      setHistory(activeSession ? activeSession.history : []);
    } else {
      setHistory([]);
    }
    setAiPlan(null); // Clear any pending plans when switching chats
    setError(null);
  }, [activeChatId, chatSessions]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [history, aiPlan, loading]);

  const handleNewChat = () => {
    setActiveChatId(null);
  };

  const handleSelectChat = (sessionId: string) => {
    setActiveChatId(sessionId);
  };

  const handleTogglePin = async (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateChatSession(session.id, { pinned: !session.pinned });
  };
  
  const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteChatSession(sessionId);
    if (activeChatId === sessionId) {
      handleNewChat();
    }
     toast({ title: 'Chat Deleted', description: 'The conversation has been removed.' });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isOffline) {
      if (isOffline) toast({ title: 'You are offline', description: 'AI features are unavailable.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setError(null);
    setAiPlan(null);
    
    const newHistory: AssistantMessage[] = [...history, { role: 'user', content: prompt }];
    setHistory(newHistory);
    const currentPrompt = prompt;
    setPrompt('');

    let currentChatId = activeChatId;

    try {
      const assistantInput: AssistantInput = {
        history: newHistory,
        tasks: allTasks,
        role,
        date: format(new Date(), 'yyyy-MM-dd'),
        chatSessionId: currentChatId,
      };
      
      const result = await runAssistant(assistantInput);

      if (!result) {
        throw new Error("I received an unexpected response from the AI. It might have been empty or in the wrong format. Could you please try rephrasing your request?");
      }

      // If it's a new chat, create it now that we have a title
      if (isNewChat && result.title) {
        currentChatId = await createChatSession(newHistory, result.title);
        setActiveChatId(currentChatId);
      }
      
      const updatedHistory = [...newHistory, { role: 'model', content: result.response }];
      setHistory(updatedHistory);
      
      // Update the session in Firestore
      if(currentChatId) {
          await updateChatSession(currentChatId, { history: updatedHistory });
      }


      const hasActions = (result.tasksToAdd && result.tasksToAdd.length > 0) ||
                         (result.tasksToUpdate && result.tasksToUpdate.length > 0) ||
                         (result.tasksToDelete && result.tasksToDelete.length > 0) ||
                         (result.subtasksToAdd && result.subtasksToAdd.length > 0);

      if (hasActions) {
        setAiPlan(result);
      }

    } catch (err: any) {
      console.error('Error in AI Assistant:', err);
      const errorMessage = err.message || "I'm sorry, something went wrong. Please try again.";
      const errorHistory = [...newHistory, { role: 'model', content: `Error: ${errorMessage}` }];
      setHistory(errorHistory);
      if (currentChatId) {
        await updateChatSession(currentChatId, { history: errorHistory });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!aiPlan) return;

    setLoading(true);
    try {
      const promises = [];
      if (aiPlan.tasksToAdd && aiPlan.tasksToAdd.length > 0) {
        promises.push(handleAddTasks(aiPlan.tasksToAdd));
      }
      if (aiPlan.tasksToUpdate && aiPlan.tasksToUpdate.length > 0) {
        for (const task of aiPlan.tasksToUpdate) {
          promises.push(updateTask(task.taskId, task.updates));
        }
      }
      if (aiPlan.tasksToDelete && aiPlan.tasksToDelete.length > 0) {
        for (const task of aiPlan.tasksToDelete) {
          promises.push(handleDeleteTask(task.taskId));
        }
      }
      if (aiPlan.subtasksToAdd && aiPlan.subtasksToAdd.length > 0) {
        for (const parent of aiPlan.subtasksToAdd) {
            promises.push(handleAddSubtasks(parent.parentId, parent.subtasks));
        }
      }
      
      await Promise.all(promises);
      
      const planAppliedHistory = [...history, { role: 'model', content: "I've applied the plan to your tasks." }];
      setHistory(planAppliedHistory);

      if (activeChatId) {
          await updateChatSession(activeChatId, { history: planAppliedHistory });
      }

      toast({
        title: 'Plan Applied!',
        description: 'Your tasks have been updated successfully.',
      });

    } catch (error) {
       console.error("Error applying AI plan:", error);
       toast({ title: "Error Applying Plan", description: "Could not apply all parts of the AI plan. Please check your tasks.", variant: "destructive" });
    } finally {
        setAiPlan(null);
        setLoading(false);
    }
  };

  const handleDiscardPlan = () => {
    setAiPlan(null);
    setHistory(prev => [...prev, {role: 'model', content: "Okay, I've discarded that plan."}]);
    if (activeChatId) {
        updateChatSession(activeChatId, { history: history });
    }
  }
  
  const sortedSessions = React.useMemo(() => {
    return [...chatSessions].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [chatSessions]);

  const PlanSection: React.FC<{title: string; icon: React.ReactNode; className: string; children: React.ReactNode}> = ({ title, icon, className, children }) => (
    <div>
        <div className={cn("font-medium flex items-center gap-2", className)}>
            {icon} {title}:
        </div>
        <ul className="list-disc pl-8 mt-1 space-y-1 text-muted-foreground">
            {children}
        </ul>
    </div>
  );

  return (
    <Card className="flex flex-col md:flex-row h-auto md:h-[480px]">
       {/* Chat History Sidebar */}
       <div className={cn(
        "border-b md:border-b-0 md:border-r flex flex-col transition-all duration-300",
        isSidebarCollapsed ? 'w-full md:w-14' : 'w-full md:w-1/3 md:min-w-[200px] md:max-w-[300px]'
      )}>
        <div className="p-2 border-b flex items-center justify-between">
           {!isSidebarCollapsed && (
            <Button variant="outline" className="w-full mr-2" onClick={handleNewChat}>
                <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
            </Button>
           )}
           {isSidebarCollapsed && (
             <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleNewChat}>
                        <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>New Chat</p>
                  </TooltipContent>
                </Tooltip>
             </TooltipProvider>
           )}
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="flex">
              {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
        </div>
         {!isSidebarCollapsed && (
          <ScrollArea className="flex-grow h-40 md:h-auto">
              <div className="space-y-1 p-2">
                  {sortedSessions.map(session => (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectChat(session.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectChat(session.id)}
                      className={cn(
                          "group relative",
                          buttonVariants({ variant: activeChatId === session.id ? 'secondary' : 'ghost' }),
                          "w-full justify-start text-left h-auto py-2"
                      )}
                    >
                        <div className="flex-1 truncate">
                            <p className="font-medium text-sm truncate">{session.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center">
                            {session.pinned && <Pin className="w-4 h-4 text-primary mr-1" />}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleTogglePin(session, e)}>
                                  {session.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 w-4" />}
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete "{session.title}".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={(e) => handleDeleteChat(session.id, e)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                  ))}
              </div>
          </ScrollArea>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            FlowForge Assistant
          </CardTitle>
          <CardDescription>
            {isNewChat ? "Your AI companion for seamless task and goal management." : "Continuing your conversation."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden h-[300px] md:h-auto">
          <ScrollArea className="flex-grow pr-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                  {history.length === 0 && !loading && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                        <Sparkles className="mx-auto h-8 w-8 text-primary/50 mb-2" />
                        <h3 className="font-semibold">I'm ready to help!</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage tasks, create plans, get summaries, and more. Just tell me what you need.
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-4">
                            Try: "Add a task to read a book tomorrow at 8pm"
                        </p>
                    </div>
                  )}

                  {history.map((msg, index) => (
                      <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                          {msg.role === 'model' && (
                              <div className="bg-primary/10 text-primary rounded-full p-2">
                                  <Bot className="w-5 h-5" />
                              </div>
                          )}
                          <div className={cn(
                              "p-3 rounded-2xl max-w-[80%] whitespace-pre-wrap", 
                              msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none',
                              msg.content.startsWith('Error:') && 'bg-destructive/20 text-destructive'
                          )}>
                              {msg.content.replace(/^Error: /, '')}
                          </div>
                           {msg.role === 'user' && (
                              <div className="bg-muted text-foreground rounded-full p-2">
                                  <User className="w-5 h-5" />
                              </div>
                          )}
                      </div>
                  ))}
                  {loading && !aiPlan && (
                      <div className="flex items-start gap-3 justify-start">
                           <div className="bg-primary/10 text-primary rounded-full p-2">
                              <Bot className="w-5 h-5" />
                          </div>
                          <div className="p-3 rounded-2xl bg-muted rounded-bl-none flex items-center gap-2">
                              <Loader2 className="animate-spin w-4 h-4" />
                              <span>Thinking...</span>
                          </div>
                      </div>
                  )}
              </div>
          </ScrollArea>
          
          {aiPlan && (
              <div className="p-4 border rounded-md space-y-4 bg-muted/30 flex-shrink-0">
                  <div>
                    <h4 className="font-semibold mb-2">Here's the plan I've generated:</h4>
                  </div>

                  <div className="space-y-4 text-sm max-h-[150px] overflow-y-auto pr-2">
                      {aiPlan.tasksToAdd && aiPlan.tasksToAdd.length > 0 && (
                          <PlanSection title="Add" icon={<PlusCircle className="h-4 w-4"/>} className="text-green-600 dark:text-green-400">
                             {aiPlan.tasksToAdd.map((t, i) => (
                                  <li key={`add-${i}`}>
                                      {t.title}
                                      {t.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(t.scheduledDate + 'T00:00:00'), 'MMM d')}{t.scheduledTime && ` @ ${t.scheduledTime}`}</Badge>}
                                  </li>
                              ))}
                          </PlanSection>
                      )}
                       {aiPlan.subtasksToAdd && aiPlan.subtasksToAdd.length > 0 && (
                          <PlanSection title="Add Subtasks" icon={<PlusCircle className="h-4 w-4"/>} className="text-sky-600 dark:text-sky-400">
                             {aiPlan.subtasksToAdd.map((item, i) => (
                                  <li key={`subtask-${i}`}>
                                     To "{allTasks.find(t => t.id === item.parentId)?.title}": {item.subtasks.length} subtask(s)
                                  </li>
                              ))}
                          </PlanSection>
                      )}
                       {aiPlan.tasksToUpdate && aiPlan.tasksToUpdate.length > 0 && (
                          <PlanSection title="Update" icon={<RefreshCcw className="h-4 w-4"/>} className="text-amber-600 dark:text-amber-400">
                              {aiPlan.tasksToUpdate.map((t, i) => {
                                  const originalTask = allTasks.find(task => task.id === t.taskId);
                                  const updates = Object.entries(t.updates)
                                      .map(([key, value]) => {
                                          if (value === null) return null;
                                          if (key === 'completed') return value ? 'Mark as complete' : 'Mark as incomplete';
                                          return `${key.charAt(0).toUpperCase() + key.slice(1)} to "${value}"`
                                      })
                                      .filter(Boolean)
                                      .join(', ');
                                  return <li key={`update-${i}`}>"{originalTask?.title || 'A task'}": {updates}</li>
                              })}
                          </PlanSection>
                      )}
                       {aiPlan.tasksToDelete && aiPlan.tasksToDelete.length > 0 && (
                          <PlanSection title="Delete" icon={<Trash2 className="h-4 w-4"/>} className="text-red-600 dark:text-red-500">
                              {aiPlan.tasksToDelete.map((t, i) => <li key={`delete-${i}`}>"{allTasks.find(task => task.id === t.taskId)?.title || 'A task'}"</li>)}
                          </PlanSection>
                      )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={handleDiscardPlan} disabled={loading}><X className="mr-2"/> Discard</Button>
                      <Button onClick={handleApplyPlan} disabled={loading}>
                          {loading && <Loader2 className="animate-spin mr-2"/>}
                          <Check className="mr-2"/> Apply Plan
                      </Button>
                  </div>
              </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-shrink-0 p-4 pt-0">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isOffline ? 'Offline - AI disabled' : 'Your command...'}
              disabled={loading || isOffline || !!aiPlan}
              autoFocus
            />
            <Button type="submit" disabled={loading || isOffline || !prompt.trim() || !!aiPlan}>
              {loading && !aiPlan ? <Loader2 className="animate-spin" /> : <CornerDownLeft />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardContent>
      </div>
    </Card>
  );
}
