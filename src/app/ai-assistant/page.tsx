
'use client';

import * as React from 'react';
import {
    BrainCircuit, Bot, User, Wand2, Loader2, PlusCircle, ListChecks,
    Lightbulb, CornerDownLeft, Calendar as CalendarIcon, Pin, PinOff,
    Trash2, ChevronsLeft, ChevronsRight, MessageSquarePlus, Mic, MicOff, Voicemail, Square, Paperclip, Image as ImageIcon, X, RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { type Mood, type UserRole, type Task, type AssistantMessage, type ChatSession } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { format, parseISO, startOfToday, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { textToSpeech } from '@/ai/flows/tts-flow';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MediaUploader from '@/components/dashboard/media-uploader';
import { runAssistant, type AssistantOutput, type AssistantInput } from '@/ai/flows/assistant-flow';


export type AssistantMode = 'planner' | 'breakdown' | 'suggester';

interface ChatPaneProps {
    mode: AssistantMode;
}

const moods: Mood[] = [
    { emoji: '⚡️', label: 'High Energy' },
    { emoji: '😊', label: 'Motivated' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😥', label: 'Stressed' },
    { emoji: '🥱', label: 'Low Energy' },
];

const userRoles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];


const ChatPane: React.FC<ChatPaneProps> = ({ mode }) => {
    const { 
        tasks, 
        userRole, 
        handleAddTasks, 
        handleAddSubtasks,
        updateTask,
        handleDeleteTask,
        plannerSessions, createPlannerSession, updatePlannerSession, deletePlannerSession,
        breakdownSessions, createBreakdownSession, updateBreakdownSession, deleteBreakdownSession,
        suggesterSessions, createSuggesterSession, updateSuggesterSession, deleteSuggesterSession,
    } = useAppContext();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
    const [history, setHistory] = React.useState<AssistantMessage[]>([]);
    const [prompt, setPrompt] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [currentPlan, setCurrentPlan] = React.useState<AssistantOutput | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);
    const [isVoiceMode, setIsVoiceMode] = React.useState(false);
    const [mediaFile, setMediaFile] = React.useState<{ dataUri: string; type: string; name: string } | null>(null);
    const [isMediaUploaderOpen, setIsMediaUploaderOpen] = React.useState(false);

    // State for inputs
    const [suggestionRole, setSuggestionRole] = React.useState<UserRole>(userRole);
    const [suggestionMood, setSuggestionMood] = React.useState<Mood['label']>('Motivated');
    const [breakdownDate, setBreakdownDate] = React.useState<Date | undefined>(new Date());
    const [selectedTaskToBreakdown, setSelectedTaskToBreakdown] = React.useState<string>('');

    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    
    const isNewChat = activeChatId === null;
    const formRef = React.useRef<HTMLFormElement>(null);

    const handleSpeechResult = (text: string) => {
        setPrompt(text);
        if (isVoiceMode) {
             // Delay submission slightly to allow state to update
            setTimeout(() => {
                formRef.current?.requestSubmit();
            }, 100);
        }
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

    const {
      sessions,
      createSession,
      updateSession,
      deleteSession,
    } = React.useMemo(() => {
        switch (mode) {
            case 'planner':
                return {
                    sessions: plannerSessions,
                    createSession: createPlannerSession,
                    updateSession: updatePlannerSession,
                    deleteSession: deletePlannerSession,
                };
            case 'breakdown':
                return {
                    sessions: breakdownSessions,
                    createSession: createBreakdownSession,
                    updateSession: updateBreakdownSession,
                    deleteSession: deleteBreakdownSession,
                };
            case 'suggester':
                return {
                    sessions: suggesterSessions,
                    createSession: createSuggesterSession,
                    updateSession: updateSuggesterSession,
                    deleteSession: deleteSuggesterSession,
                };
        }
    }, [mode, plannerSessions, createPlannerSession, updatePlannerSession, deletePlannerSession, breakdownSessions, createBreakdownSession, updateBreakdownSession, deleteBreakdownSession, suggesterSessions, createSuggesterSession, updateSuggesterSession, deleteSuggesterSession]);


    React.useEffect(() => {
        if (activeChatId) {
          const activeSession = sessions.find(s => s.id === activeChatId);
          if (activeSession) {
            setHistory(activeSession.history);
          } else {
            setHistory([]);
          }
        } else {
          setHistory([]);
        }
        setCurrentPlan(null); // Clear plan when switching chats
    }, [activeChatId, sessions]);
    
     React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, loading, currentPlan]);

    const getInitialPrompt = (currentPrompt: string) => {
        switch (mode) {
            case 'planner':
                return `My goal is: "${currentPrompt}". Please create a detailed, step-by-step plan to achieve this.`;
            case 'suggester':
                return `My goal is: "${currentPrompt}". My role is ${suggestionRole} and my mood is ${suggestionMood}. Give me some creative ideas or tasks to get started.`;
            // Breakdown prompt is now handled by the regular chat submission
            default:
                return currentPrompt;
        }
    };
    
    const canSubmit = () => {
        if (loading || isListening || isPlaying) return false;
        return prompt.trim() !== '' || !!mediaFile;
    }

    const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
        if (e) e.preventDefault();
        
        const finalPrompt = customPrompt || prompt;

        if ((!finalPrompt.trim() && !mediaFile)) return;

        if (isListening) stopListening();
        if (isPlaying) stopAudio();

        setLoading(true);
        setCurrentPlan(null);

        const isFirstMessage = history.length === 0;
        const currentPrompt = isFirstMessage ? getInitialPrompt(finalPrompt) : finalPrompt;
        
        const newHistory: AssistantMessage[] = [...history, { 
            role: 'user', 
            content: currentPrompt,
            mediaDataUri: mediaFile?.dataUri || null,
            mediaType: mediaFile?.type || null,
        }];
        setHistory(newHistory);
        setPrompt('');
        setMediaFile(null);

        let currentChatId = activeChatId;

        try {
            const assistantInput: AssistantInput = {
                history: newHistory.map(h => ({ role: h.role, content: h.content })),
                tasks: tasks.map(t => ({ id: t.id, title: t.title, completed: t.completed, scheduledDate: t.scheduledDate })),
                role: userRole,
                date: format(new Date(), 'yyyy-MM-dd'),
                chatSessionId: currentChatId,
            };

            // Only include historyWithMedia if there's media
            if (newHistory.some(h => h.mediaDataUri)) {
                (assistantInput as any).historyWithMedia = newHistory;
            }
            
            const result = await runAssistant(assistantInput);
            
            if (result) {
                if (isNewChat && result.title) {
                    currentChatId = await createSession(newHistory, result.title);
                    setActiveChatId(currentChatId);
                }
                
                const modelResponse: AssistantMessage = { role: 'model', content: result.response };
                
                if (isVoiceMode) {
                    try {
                        const ttsResult = await textToSpeech({ text: result.response });
                        if(ttsResult.audioDataUri) playAudio(ttsResult.audioDataUri);
                    } catch (ttsError) {
                        console.error("Text-to-speech failed:", ttsError);
                        toast({ title: "Voice Error", description: "Could not generate audio response.", variant: "destructive"});
                    }
                }
                
                const updatedHistory = [...newHistory, modelResponse];
                setHistory(updatedHistory);

                if (currentChatId) {
                    await updateSession(currentChatId, { history: updatedHistory });
                }

                const hasActions = (result.tasksToAdd && result.tasksToAdd.length > 0) ||
                    (result.tasksToUpdate && result.tasksToUpdate.length > 0) ||
                    (result.tasksToDelete && result.tasksToDelete.length > 0) ||
                    (result.subtasksToAdd && result.subtasksToAdd.length > 0);

                if (hasActions) {
                    setCurrentPlan(result);
                } else {
                    setCurrentPlan(null);
                }
            } else {
                 throw new Error("The AI returned an empty response.");
            }

        } catch (err: any) {
            console.error(err);
            const errorResponse: AssistantMessage = { role: 'model', content: `Error: ${err.message}` };
            const errorHistory = [...newHistory, errorResponse];
            setHistory(errorHistory);
             if (currentChatId) {
                await updateSession(currentChatId, { history: errorHistory });
            }
        } finally {
            setLoading(false);
            if (isVoiceMode) {
                setIsVoiceMode(false);
            }
        }
    };

    const handleBreakdownSubmit = () => {
        if (!selectedTaskToBreakdown) {
            toast({
                title: "No Task Selected",
                description: "Please select a task from the list to break down.",
                variant: "destructive"
            });
            return;
        }
        const task = tasks.find(t => t.id === selectedTaskToBreakdown);
        if (task) {
            handleSubmit(undefined, `Break down this task: "${task.title}"`);
        }
    };
    
    const handleFinalize = async () => {
        if (!currentPlan) return;

        setLoading(true);
        try {
            const promises = [];
            if (currentPlan.tasksToAdd && currentPlan.tasksToAdd.length > 0) {
                promises.push(handleAddTasks(currentPlan.tasksToAdd));
            }
            if (currentPlan.tasksToUpdate && currentPlan.tasksToUpdate.length > 0) {
                for (const task of currentPlan.tasksToUpdate) {
                promises.push(updateTask(task.taskId, task.updates));
                }
            }
            if (currentPlan.tasksToDelete && currentPlan.tasksToDelete.length > 0) {
                for (const task of currentPlan.tasksToDelete) {
                promises.push(handleDeleteTask(task.taskId));
                }
            }
            if (currentPlan.subtasksToAdd && currentPlan.subtasksToAdd.length > 0) {
                for (const parent of currentPlan.subtasksToAdd) {
                    promises.push(handleAddSubtasks(parent.parentId, parent.subtasks));
                }
            }
            
            await Promise.all(promises);
            
            const planAppliedHistory = [...history, { role: 'model', content: "Okay, I've applied that plan." }];
            setHistory(planAppliedHistory);
            if (activeChatId) {
                await updateSession(activeChatId, { history: planAppliedHistory });
            }
            toast({ title: 'Plan Applied!', description: 'Your tasks have been updated.' });

        } catch (error) {
            console.error("Error applying AI plan:", error);
            toast({ title: "Error Applying Plan", description: "Could not apply all parts of the AI plan.", variant: "destructive" });
        } finally {
            setCurrentPlan(null);
            setLoading(false);
        }
    };
    
    const handleDiscardPlan = () => {
        const discardedHistory = [...history, { role: 'model', content: "Okay, I've discarded that plan." }];
        setHistory(discardedHistory);
        if (activeChatId) {
            updateSession(activeChatId, { history: discardedHistory });
        }
        setCurrentPlan(null);
    };

    const handleNewChat = () => {
        if(isPlaying) stopAudio();
        setActiveChatId(null);
    };

    const handleSelectChat = (sessionId: string) => {
        if(isPlaying) stopAudio();
        setActiveChatId(sessionId);
    };

    const handleTogglePin = async (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        await updateSession(session.id, { pinned: !session.pinned });
    };

    const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteSession(sessionId);
        if (activeChatId === sessionId) {
            handleNewChat();
        }
        toast({ title: 'Chat Deleted', description: 'The conversation has been removed.' });
    };
    
    const handleDictation = () => {
        if (isListening) {
          stopListening();
        } else {
          setIsVoiceMode(false); // Ensure we are in dictation mode
          if(isPlaying) stopAudio();
          startListening();
        }
    };
    
    const handleVoiceMode = () => {
        if (isListening) {
          stopListening();
          setIsVoiceMode(false);
        } else {
          setIsVoiceMode(true);
          if(isPlaying) stopAudio();
          startListening();
        }
    };

    const handleMediaSelect = (file: { dataUri: string; type: string; name: string }) => {
        setMediaFile(file);
        setIsMediaUploaderOpen(false);
    }

    const sortedSessions = React.useMemo(() => {
        return [...sessions].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [sessions]);


    const renderInitialInputs = () => {
        if (history.length > 0) return null;

        const templates = {
            planner: {
                title: 'AI Task Planner',
                description: "Describe your goal, and I'll generate a step-by-step plan for you.",
                placeholder: "e.g., Learn to build a website in 30 days, starting tomorrow.",
            },
            breakdown: {
                title: 'Task Breakdown',
                description: "Select a task to break into smaller steps, or start a new chat.",
                placeholder: "Or ask me anything else...",
            },
            suggester: {
                title: 'Smart Suggestions',
                description: "Tell me your goal, role, and mood, and I'll brainstorm some ideas.",
                placeholder: "e.g., get fit",
            }
        };

        const currentTemplate = templates[mode];

        if (mode === 'breakdown') {
            const tasksForSelectedDate = tasks.filter(task => {
              if (!breakdownDate) return true; // Show all if no date selected
              if (!task.scheduledDate) return false;
              return format(parseISO(task.scheduledDate), 'yyyy-MM-dd') === format(breakdownDate, 'yyyy-MM-dd');
            });

            return (
                 <div className="p-4 bg-muted/30 rounded-lg border border-dashed h-full flex flex-col justify-center">
                    <h3 className="text-center font-semibold">{currentTemplate.title}</h3>
                    <p className="text-center text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">{currentTemplate.description}</p>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("justify-start text-left font-normal", !breakdownDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {breakdownDate ? format(breakdownDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={breakdownDate} onSelect={setBreakdownDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Select onValueChange={setSelectedTaskToBreakdown} value={selectedTaskToBreakdown}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a task..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasksForSelectedDate.length > 0 ? (
                                        tasksForSelectedDate.map(task => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No tasks for this day.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleBreakdownSubmit} disabled={!selectedTaskToBreakdown}>
                            <ListChecks className="mr-2" /> Breakdown Selected Task
                        </Button>
                        <div className="relative text-center my-4">
                            <span className="absolute left-0 top-1/2 w-full h-px bg-border"></span>
                            <span className="relative bg-muted/30 px-2 text-xs text-muted-foreground">OR</span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
             <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center h-full flex flex-col justify-center items-center">
                <h3 className="font-semibold">{currentTemplate.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{currentTemplate.description}</p>
                <div className="w-full mt-4">
                     {mode === 'suggester' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select onValueChange={(v: UserRole) => setSuggestionRole(v)} defaultValue={suggestionRole} disabled={loading}>
                                    <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                                    <SelectContent>
                                        {userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select onValueChange={(v: Mood['label']) => setSuggestionMood(v)} defaultValue={suggestionMood} disabled={loading}>
                                    <SelectTrigger><SelectValue placeholder="Select mood..." /></SelectTrigger>
                                    <SelectContent>
                                        {moods.map(m => <SelectItem key={m.label} value={m.label}>{m.emoji} {m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input 
                                placeholder={currentTemplate.placeholder}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={loading || isListening}
                            />
                        </div>
                    ) : (
                         <Textarea
                            placeholder={currentTemplate.placeholder}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={isMobile ? 2 : 3}
                            disabled={loading || isListening}
                        />
                    )}
                </div>
             </div>
        );
    };

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
        <div className="flex flex-col md:flex-row h-full">
            {/* Chat History Sidebar */}
            <div className={cn(
                "border-b md:border-b-0 md:border-r flex flex-col transition-all duration-300 bg-muted/20",
                isSidebarCollapsed ? 'w-full md:w-14' : 'w-full md:w-1/3 lg:w-1/4'
            )}>
                <div className="p-2 border-b flex items-center justify-between flex-shrink-0">
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
                 <ScrollArea className="flex-grow h-40 md:h-auto">
                    {!isSidebarCollapsed && (
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
                                <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                    )}
                </ScrollArea>
            </div>

             {/* Main Chat Area */}
            <div className="flex-1 flex flex-col p-2 sm:p-4 md:pl-6 overflow-hidden">
                <ScrollArea className="flex-grow overflow-y-auto pr-4 -mr-4 mb-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {history.length === 0 && !loading && renderInitialInputs()}
                        {history.map((msg, index) => (
                            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'model' && (
                                    <div className="bg-primary/10 text-primary rounded-full p-2 flex-shrink-0">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                )}
                                <div className={cn(
                                    "p-3 rounded-2xl max-w-[80%] whitespace-pre-wrap text-sm sm:text-base",
                                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none',
                                    msg.content.startsWith('Error:') && 'bg-destructive/20 text-destructive'
                                )}>
                                    {msg.mediaDataUri && msg.mediaType?.startsWith('image/') && (
                                        <Image src={msg.mediaDataUri} alt="User upload" width={200} height={200} className="rounded-md mb-2" />
                                    )}
                                    {msg.mediaDataUri && !msg.mediaType?.startsWith('image/') && (
                                        <div className="flex items-center gap-2 p-2 rounded-md bg-background/50 mb-2">
                                            <Paperclip className="h-4 w-4" />
                                            <span className="text-xs truncate">Attached: {msg.mediaType}</span>
                                        </div>
                                    )}
                                    {msg.content.replace(/^Error: /, '')}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="bg-muted text-foreground rounded-full p-2 flex-shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && !currentPlan && (
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
            
                {currentPlan && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/50 mb-4 flex flex-col overflow-hidden max-h-[250px] sm:max-h-[200px]">
                        <h4 className="font-semibold flex-shrink-0">Suggested Plan:</h4>
                        <ScrollArea className="flex-grow overflow-y-auto pr-2">
                            <div className="space-y-4 text-sm">
                                {currentPlan.tasksToAdd && currentPlan.tasksToAdd.length > 0 && (
                                <PlanSection title="Add" icon={<PlusCircle className="h-4 w-4"/>} className="text-green-600 dark:text-green-400">
                                    {currentPlan.tasksToAdd.map((t, i) => (
                                    <li key={`add-${i}`}>
                                        {t.title}
                                        {t.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(t.scheduledDate + 'T00:00:00'), 'MMM d')}{t.scheduledTime && ` @ ${t.scheduledTime}`}</Badge>}
                                    </li>
                                    ))}
                                </PlanSection>
                                )}
                                {currentPlan.subtasksToAdd && currentPlan.subtasksToAdd.length > 0 && (
                                <PlanSection title="Add Subtasks" icon={<PlusCircle className="h-4 w-4"/>} className="text-sky-600 dark:text-sky-400">
                                    {currentPlan.subtasksToAdd.map((item, i) => (
                                    <li key={`subtask-${i}`}>
                                        To "{tasks.find(t => t.id === item.parentId)?.title}": {item.subtasks.length} subtask(s)
                                    </li>
                                    ))}
                                </PlanSection>
                                )}
                                {currentPlan.tasksToUpdate && currentPlan.tasksToUpdate.length > 0 && (
                                <PlanSection title="Update" icon={<RefreshCcw className="h-4 w-4"/>} className="text-amber-600 dark:text-amber-400">
                                    {currentPlan.tasksToUpdate.map((t, i) => {
                                    const originalTask = tasks.find(task => task.id === t.taskId);
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
                                {currentPlan.tasksToDelete && currentPlan.tasksToDelete.length > 0 && (
                                <PlanSection title="Delete" icon={<Trash2 className="h-4 w-4"/>} className="text-red-600 dark:text-red-500">
                                    {currentPlan.tasksToDelete.map((t, i) => <li key={`delete-${i}`}>"{tasks.find(task => task.id === t.taskId)?.title || 'A task'}"</li>)}
                                </PlanSection>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
                            <Button variant="ghost" onClick={handleDiscardPlan} disabled={loading}><X className="mr-2"/> Discard</Button>
                            <Button onClick={handleFinalize} disabled={loading}>
                                {loading && <Loader2 className="animate-spin mr-2"/>}
                                <PlusCircle className="mr-2"/> Finalize & Add
                            </Button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} ref={formRef} className="mt-auto space-y-4 flex-shrink-0">
                     {mediaFile && (
                        <div className="flex items-center gap-2 p-2 mb-2 border rounded-md bg-muted/50 text-sm">
                            {mediaFile.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="flex-1 truncate text-muted-foreground">{mediaFile.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMediaFile(null)}>
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    )}
                    <div className="relative w-full">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={history.length > 0 ? "Need changes? Type or use the mic..." : "Describe your goal..."}
                            disabled={loading || isListening || isPlaying}
                            autoFocus
                            className={cn(isAvailable && "pr-10")}
                        />
                    </div>
                
                    <div className="flex items-center gap-2">
                         <Dialog open={isMediaUploaderOpen} onOpenChange={setIsMediaUploaderOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="icon" disabled={loading || isListening || isPlaying}>
                                                <Paperclip className="h-5 w-5"/>
                                            </Button>
                                        </DialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Attach File or Photo</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Attach Media</DialogTitle>
                                </DialogHeader>
                                <MediaUploader onMediaSelect={handleMediaSelect} />
                            </DialogContent>
                        </Dialog>
                         {isAvailable && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant={isListening && !isVoiceMode ? "destructive" : "outline"}
                                            onClick={handleDictation}
                                            disabled={loading || isPlaying || (isListening && isVoiceMode)}
                                        >
                                            {isListening && !isVoiceMode ? <MicOff className="h-5 w-5"/> : <Mic className="h-5 w-5"/>}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Dictate Message</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant={isVoiceMode ? "default" : "outline"}
                                            onClick={handleVoiceMode}
                                            disabled={loading || isPlaying || (isListening && !isVoiceMode)}
                                        >
                                            <Voicemail className={cn("h-5 w-5", isListening && isVoiceMode && "animate-pulse")}/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isVoiceMode ? "Stop Voice Mode" : "Start Voice Mode"}</p>
                                    </TooltipContent>
                                </Tooltip>
                                 {isPlaying && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="destructive"
                                                onClick={stopAudio}
                                            >
                                                <Square className="h-5 w-5"/>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Stop Speaking</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </TooltipProvider>
                        )}
                        <Button type="submit" disabled={!canSubmit()} className="w-full">
                            {loading ? <Loader2 className="animate-spin" /> : history.length > 0 ? <CornerDownLeft/> : <Wand2/>}
                            <span className="ml-2">{loading ? 'Generating...' : history.length > 0 ? 'Send' : 'Generate'}</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default function AIAssistantPage() {
    const isMobile = useIsMobile();
    return (
        <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
            <header>
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold font-headline">AI Assistant Hub</h1>
                </div>
                <p className="text-muted-foreground">Your command center for AI-powered productivity. Converse with the AI to plan, break down, and create tasks.</p>
            </header>

            <Tabs defaultValue="planner" className="w-full flex-grow flex flex-col">
                <TabsList className={cn("grid w-full h-auto", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                    <TabsTrigger value="planner" className="py-2 sm:py-1.5"><Wand2 className="mr-2"/> AI Task Planner</TabsTrigger>
                    <TabsTrigger value="breakdown" className="py-2 sm:py-1.5"><ListChecks className="mr-2"/> Task Breakdown</TabsTrigger>
                    <TabsTrigger value="suggester" className="py-2 sm:py-1.5"><Lightbulb className="mr-2"/> Smart Suggestions</TabsTrigger>
                </TabsList>
                <Card className="mt-4 flex-grow">
                    <CardContent className="p-0 h-full overflow-hidden">
                        <TabsContent value="planner" className="h-full m-0">
                            <ChatPane mode="planner" />
                        </TabsContent>
                        <TabsContent value="breakdown" className="h-full m-0">
                           <ChatPane mode="breakdown" />
                        </TabsContent>
                        <TabsContent value="suggester" className="h-full m-0">
                            <ChatPane mode="suggester" />
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}

    