
'use client';

import * as React from 'react';
import { Wand2, Loader2, Sparkles, Check, X, PlusCircle, RefreshCcw, Trash2, Bot, User, CornerDownLeft, MessageSquarePlus, Pin, PinOff, ChevronsLeft, ChevronsRight, Mic, MicOff, Voicemail, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import type { Task, UserRole, AssistantMessage, ChatSession } from '@/lib/types';
import { runAgent, type AgentOutput, type AgentInput } from '@/ai/flows/agent-flow';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
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
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { textToSpeech } from '@/ai/flows/tts-flow';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import TextareaAutosize from 'react-textarea-autosize';


interface AIAssistantProps {
  allTasks: Task[];
  role: UserRole;
}

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

const MainContent = ({
    isMobile,
    isOffline,
    isAvailable,
    history,
    loading,
    aiPlan,
    prompt,
    setPrompt,
    formRef,
    scrollAreaRef,
    handleSubmit,
    handleDiscardPlan,
    handleApplyPlan,
    isListening,
    isPlaying,
    isVoiceMode,
    handleDictation,
    handleVoiceMode,
    stopAudio,
    allTasks,
}: {
    isMobile: boolean;
    isOffline: boolean;
    isAvailable: boolean;
    history: AssistantMessage[];
    loading: boolean;
    aiPlan: AgentOutput | null;
    prompt: string;
    setPrompt: (p: string) => void;
    formRef: React.RefObject<HTMLFormElement>;
    scrollAreaRef: React.RefObject<HTMLDivElement>;
    handleSubmit: (e: React.FormEvent) => void;
    handleDiscardPlan: () => void;
    handleApplyPlan: () => void;
    isListening: boolean;
    isPlaying: boolean;
    isVoiceMode: boolean;
    handleDictation: () => void;
    handleVoiceMode: () => void;
    stopAudio: () => void;
    allTasks: Task[];
}) => {
  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <CardHeader className="p-0 pb-4 flex-shrink-0 flex flex-row items-center gap-2">
            {isMobile && (
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronsRight className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            )}
            <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-primary" />
                FlowForge Assistant
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {history.length === 0 && !loading && (
                            <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center h-full flex flex-col justify-center items-center">
                                <Sparkles className="mx-auto h-8 w-8 text-primary/50 mb-2" />
                                <h3 className="font-semibold">How can I help you?</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Ask me to add, update, or delete tasks. You can also ask me for a summary, analysis, or anything else you can think of.
                                </p>
                                <p className="text-xs text-muted-foreground/80 mt-4">
                                    Example: "Add a task to read a book tomorrow at 8pm"
                                </p>
                            </div>
                        )}

                        {history.map((msg, index) => (
                            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'model' && (
                                    <div className="bg-primary/10 text-primary rounded-full p-2 flex-shrink-0">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                )}
                                <div className={cn(
                                    "p-3 rounded-2xl max-w-[80%] whitespace-pre-wrap break-words text-sm sm:text-base",
                                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none',
                                    msg.content.startsWith('Error:') && 'bg-destructive/20 text-destructive'
                                )}>
                                    {msg.content.replace(/^Error: /, '')}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="bg-muted text-foreground rounded-full p-2 flex-shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && !aiPlan && (
                            <div className="flex items-start gap-3 justify-start">
                                <div className="bg-primary/10 text-primary rounded-full p-2 flex-shrink-0">
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
                    <div className="p-4 border rounded-md bg-muted/30 flex-shrink-0 mt-4 flex flex-col overflow-hidden max-h-[250px] sm:max-h-[200px]">
                        <h4 className="font-semibold mb-2 flex-shrink-0">Here's the plan I've generated:</h4>
                        <ScrollArea className="flex-grow pr-2">
                            <div className="space-y-4 text-sm">
                                {aiPlan.tasksToAdd && aiPlan.tasksToAdd.length > 0 && (
                                    <PlanSection title="Add" icon={<PlusCircle className="h-4 w-4" />} className="text-green-600 dark:text-green-400">
                                        {aiPlan.tasksToAdd.map((t, i) => (
                                            <li key={`add-${i}`}>
                                                {t.title}
                                                {t.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(t.scheduledDate + 'T00:00:00'), 'MMM d')}{t.scheduledTime && ` @ ${t.scheduledTime}`}</Badge>}
                                            </li>
                                        ))}
                                    </PlanSection>
                                )}
                                {aiPlan.subtasksToAdd && aiPlan.subtasksToAdd.length > 0 && (
                                    <PlanSection title="Add Subtasks" icon={<PlusCircle className="h-4 w-4" />} className="text-sky-600 dark:text-sky-400">
                                        {aiPlan.subtasksToAdd.map((item, i) => (
                                            <li key={`subtask-${i}`}>
                                                To "{allTasks.find(t => t.id === item.parentId)?.title}": {item.subtasks.length} subtask(s)
                                            </li>
                                        ))}
                                    </PlanSection>
                                )}
                                {aiPlan.tasksToUpdate && aiPlan.tasksToUpdate.length > 0 && (
                                    <PlanSection title="Update" icon={<RefreshCcw className="h-4 w-4" />} className="text-amber-600 dark:text-amber-400">
                                        {aiPlan.tasksToUpdate.map((t, i) => {
                                            const originalTask = allTasks.find(task => task.id === t.taskId);
                                            const updates = Object.entries(t.updates)
                                                .map(([key, value]) => {
                                                    if (value === null) return null;
                                                    if (key === 'completed') return value ? 'Mark as complete' : 'Mark as incomplete';
                                                    if(key === 'scheduledTime' && value === undefined) return null;
                                                    return `${key.charAt(0).toUpperCase() + key.slice(1)} to "${value}"`
                                                })
                                                .filter(Boolean)
                                                .join(', ');
                                            return <li key={`update-${i}`}>"{originalTask?.title || 'A task'}": {updates}</li>
                                        })}
                                    </PlanSection>
                                )}
                                {aiPlan.tasksToDelete && aiPlan.tasksToDelete.length > 0 && (
                                    <PlanSection title="Delete" icon={<Trash2 className="h-4 w-4" />} className="text-red-600 dark:text-red-500">
                                        {aiPlan.tasksToDelete.map((t, i) => <li key={`delete-${i}`}>"{allTasks.find(task => task.id === t.taskId)?.title || 'A task'}"</li>)}
                                    </PlanSection>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
                            <Button variant="ghost" onClick={handleDiscardPlan} disabled={loading}><X className="mr-2" /> Discard</Button>
                            <Button onClick={handleApplyPlan} disabled={loading}>
                                {loading && <Loader2 className="animate-spin mr-2" />}
                                <Check className="mr-2" /> Apply Plan
                            </Button>
                        </div>
                    </div>
                )}

                <form ref={formRef} onSubmit={handleSubmit} className="flex-shrink-0 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex items-center w-full">
                            <TextareaAutosize
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                placeholder={isOffline ? 'Offline - AI disabled' : 'Your command...'}
                                disabled={loading || isOffline || !!aiPlan || isListening || isPlaying}
                                className={cn(
                                    "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
                                    isAvailable ? "pr-20" : "pr-3"
                                )}
                                minRows={1}
                                maxRows={5}
                            />
                            {isAvailable && (
                                <div className="absolute top-1/2 right-1.5 -translate-y-1/2 flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant={isListening && !isVoiceMode ? "destructive" : "ghost"}
                                                    className="h-7 w-7"
                                                    onClick={handleDictation}
                                                    disabled={loading || isOffline || !!aiPlan || isPlaying || (isListening && isVoiceMode)}
                                                >
                                                    {isListening && !isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Dictate Message</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant={isVoiceMode ? "default" : "ghost"}
                                                    className="h-7 w-7"
                                                    onClick={handleVoiceMode}
                                                    disabled={loading || isOffline || !!aiPlan || isPlaying || (isListening && !isVoiceMode)}
                                                >
                                                    <Voicemail className={cn("h-4 w-4", isListening && isVoiceMode && "animate-pulse")} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isVoiceMode ? "Stop Voice Mode" : "Start Voice Mode"}</p></TooltipContent>
                                        </Tooltip>
                                        {isPlaying && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive"
                                                        onClick={stopAudio}
                                                    >
                                                        <Square className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Stop Speaking</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                </div>
                            )}
                        </div>
                        <Button type="submit" disabled={loading || isOffline || !prompt || !!aiPlan || isListening || isPlaying}>
                            {loading && !aiPlan ? <Loader2 className="animate-spin" /> : <CornerDownLeft />}
                            <span className="sr-only">Send</span>
                        </Button>
                    </div>
                </form>
            </div>
        </CardContent>
    </div>
  )
};

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
  const [aiPlan, setAiPlan] = React.useState<AgentOutput | null>(null);
  const isOffline = useOfflineStatus();
  
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<AssistantMessage[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);
  const [isVoiceMode, setIsVoiceMode] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const isNewChat = activeChatId === null;
  const isMobile = useIsMobile();

  const handleSpeechResult = (text: string) => {
      setPrompt(text);
  };
  
  const { isListening, isAvailable, startListening, stopListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onEnd: () => {
      // This will only trigger auto-submit in voice mode.
      if (isVoiceMode && prompt) {
        formRef.current?.requestSubmit();
      }
    },
  });
  
  const { play: playAudio, stop: stopAudio, isPlaying } = useSpeechSynthesis();

  // Effect to load a chat session's history when it becomes active
  React.useEffect(() => {
    if (activeChatId) {
      const activeSession = chatSessions.find(s => s.id === activeChatId);
      setHistory(activeSession ? activeSession.history : []);
    } else {
      setHistory([]);
    }
    setAiPlan(null); // Clear any pending plans when switching chats
  }, [activeChatId, chatSessions]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [history, aiPlan, loading]);

  const handleNewChat = () => {
    if (isPlaying) stopAudio();
    setActiveChatId(null);
    setIsSheetOpen(false);
  };

  const handleSelectChat = (sessionId: string) => {
    if (isPlaying) stopAudio();
    setActiveChatId(sessionId);
    setIsSheetOpen(false);
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

    if(isListening) stopListening();
    if(isPlaying) stopAudio();


    setLoading(true);
    setAiPlan(null);
    
    const newHistory: AssistantMessage[] = [...history, { 
        role: 'user', 
        content: prompt,
    }];
    setHistory(newHistory);
    setPrompt('');

    let currentChatId = activeChatId;

    try {
      const agentInput: AgentInput = {
        history: newHistory,
        tasks: allTasks.map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            scheduledDate: t.scheduledDate,
            scheduledTime: t.scheduledTime,
            description: t.description,
            subtasks: t.subtasks?.map(st => ({ id: st.id, title: st.title, completed: st.completed }))
        })),
        role,
        date: format(new Date(), 'yyyy-MM-dd'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        chatSessionId: currentChatId,
      };
      
      const result = await runAgent(agentInput);

      if (!result) {
        throw new Error("I received an unexpected response from the AI. It might have been empty or in the wrong format. Could you please try rephrasing your request?");
      }

      // If it's a new chat, create it now that we have a title
      if (isNewChat && result.title) {
        currentChatId = await createChatSession(newHistory, result.title);
        setActiveChatId(currentChatId);
      }
      
      const modelResponse: AssistantMessage = { role: 'model', content: result.response };
      
      if (isVoiceMode) {
        try {
            const ttsResult = await textToSpeech({ text: result.response });
            if (ttsResult.audioDataUri) {
                playAudio(ttsResult.audioDataUri);
            }
        } catch (ttsError) {
            console.error("Text-to-speech failed:", ttsError);
            toast({ title: "Voice Error", description: "Could not generate audio response.", variant: "destructive"});
        }
      }

      const updatedHistory = [...newHistory, modelResponse];
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
      if(isVoiceMode) {
        setIsVoiceMode(false);
      }
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
    const discardedHistory = [...history, { role: 'model', content: "Okay, I've discarded that plan." }];
    setHistory(discardedHistory);
    if (activeChatId) {
        updateChatSession(activeChatId, { history: discardedHistory });
    }
  }

  const handleDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      setIsVoiceMode(false); // Ensure we are in dictation mode
      if (isPlaying) stopAudio();
      startListening();
    }
  };

  const handleVoiceMode = () => {
    if (isListening) {
      stopListening();
      setIsVoiceMode(false);
    } else {
      setIsVoiceMode(true);
      if (isPlaying) stopAudio();
      startListening();
    }
  };
  
  const sortedSessions = React.useMemo(() => {
    return [...chatSessions].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [chatSessions]);

  const SidebarContent = () => (
    <div className='h-full flex flex-col'>
      <SheetHeader className="p-2 border-b flex-shrink-0">
          <SheetTitle className="sr-only">Chat History</SheetTitle>
      </SheetHeader>
      <div className="p-2 border-b flex items-center justify-between flex-shrink-0">
        <Button variant="outline" size="sm" className="w-full mr-1" onClick={handleNewChat}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-grow">
        <div className="space-y-1 p-2">
          {sortedSessions.map(session => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectChat(session.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectChat(session.id)}
              className={cn(
                "group relative flex w-full flex-col text-left p-2 rounded-md",
                buttonVariants({ variant: activeChatId === session.id ? 'secondary' : 'ghost', size: 'sm' }),
                'h-auto min-h-[48px]'
              )}
            >
              <div className="w-full">
                <p className="font-medium text-xs break-words whitespace-normal pr-8">{session.title}</p>
              </div>
              <div className="absolute top-1 right-1 flex-shrink-0 flex items-center">
                {session.pinned && <Pin className="w-3 h-3 text-primary mr-1" />}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleTogglePin(session, e)}>
                        {session.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{session.pinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                  </Tooltip>
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete</p></TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{session.title}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => handleDeleteChat(session.id, e)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const mainContentProps = {
    isMobile,
    isOffline,
    isAvailable,
    history,
    loading,
    aiPlan,
    prompt,
    setPrompt,
    formRef,
    scrollAreaRef,
    handleSubmit,
    handleDiscardPlan,
    handleApplyPlan,
    isListening,
    isPlaying,
    isVoiceMode,
    handleDictation,
    handleVoiceMode,
    stopAudio,
    allTasks,
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
          {isMobile ? (
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <MainContent {...mainContentProps} />
                <SheetContent side="left" className="p-0 w-[280px]">
                    <SidebarContent />
                </SheetContent>
            </Sheet>
          ) : (
             <div className={cn(
              "border-r flex flex-col transition-all duration-300 bg-muted/20",
              isSidebarCollapsed ? 'w-14' : 'w-60'
              )}>
                  <div className="p-2 border-b flex items-center justify-between flex-shrink-0">
                      {!isSidebarCollapsed && (
                          <Button variant="outline" size="sm" className="w-full mr-1" onClick={handleNewChat}>
                              <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
                          </Button>
                      )}
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="h-8 w-8">
                                      {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right"><p>{isSidebarCollapsed ? 'Expand' : 'Collapse'}</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  </div>
                 {!isSidebarCollapsed && (
                    <ScrollArea className="flex-grow">
                        <div className="space-y-1 p-2">
                            {sortedSessions.map(session => (
                                <div
                                    key={session.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelectChat(session.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSelectChat(session.id)}
                                    className={cn(
                                        "group relative flex w-full flex-col text-left p-2 rounded-md",
                                        buttonVariants({ variant: activeChatId === session.id ? 'secondary' : 'ghost', size: 'sm' }),
                                        'h-auto min-h-[48px]'
                                    )}
                                >
                                  <div className="w-full">
                                      <p className="font-medium text-xs break-words whitespace-normal pr-8">{session.title}</p>
                                  </div>
                                  <div className="absolute top-1 right-1 flex-shrink-0 flex items-center">
                                      {session.pinned && <Pin className="w-3 h-3 text-primary mr-1" />}
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleTogglePin(session, e)}>
                                                      {session.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 w-3.5" />}
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent><p>{session.pinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                                          </Tooltip>
                                          <AlertDialog>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                                              <Trash2 className="w-3.5 h-3.5" />
                                                          </Button>
                                                      </AlertDialogTrigger>
                                                  </TooltipTrigger>
                                                  <TooltipContent><p>Delete</p></TooltipContent>
                                              </Tooltip>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                                                      <AlertDialogDescription>This will permanently delete "{session.title}".</AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={(e) => handleDeleteChat(session.id, e)}>Delete</AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </TooltipProvider>
                                  </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 )}
              </div>
          )}
          {/* Main Content */}
          {!isMobile && <MainContent {...mainContentProps} />}
      </div>
    </Card>
  );
}
