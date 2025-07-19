
'use client';

import * as React from 'react';
import {
    BrainCircuit, Bot, User, Wand2, Loader2, PlusCircle, ListChecks,
    Lightbulb, CornerDownLeft, Calendar as CalendarIcon, Pin, PinOff,
    Trash2, ChevronsLeft, ChevronsRight, MessageSquarePlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { type Mood, type UserRole, type Task, type AssistantMessage, type ChatSession } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
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

import { runPlanner, type PlannerOutput } from '@/ai/flows/planner-flow';
import { runBreakdowner, type BreakdownerOutput } from '@/ai/flows/breakdown-flow';
import { runSuggester, type SuggesterOutput } from '@/ai/flows/suggester-flow';
import { useIsMobile } from '@/hooks/use-mobile';

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
    const [currentPlan, setCurrentPlan] = React.useState<PlannerOutput['tasks'] | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);

    // State for inputs
    const [taskToBreakdown, setTaskToBreakdown] = React.useState('');
    const [suggestionRole, setSuggestionRole] = React.useState<UserRole>(userRole);
    const [suggestionMood, setSuggestionMood] = React.useState<Mood['label']>('Motivated');
    const [breakdownDate, setBreakdownDate] = React.useState<Date | undefined>(new Date());
    
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    const isNewChat = activeChatId === null;

    const {
      sessions,
      createSession,
      updateSession,
      deleteSession,
      runAIFlow,
    } = React.useMemo(() => {
        switch (mode) {
            case 'planner':
                return {
                    sessions: plannerSessions,
                    createSession: createPlannerSession,
                    updateSession: updatePlannerSession,
                    deleteSession: deletePlannerSession,
                    runAIFlow: runPlanner as any,
                };
            case 'breakdown':
                return {
                    sessions: breakdownSessions,
                    createSession: createBreakdownSession,
                    updateSession: updateBreakdownSession,
                    deleteSession: deleteBreakdownSession,
                    runAIFlow: runBreakdowner as any,
                };
            case 'suggester':
                return {
                    sessions: suggesterSessions,
                    createSession: createSuggesterSession,
                    updateSession: updateSuggesterSession,
                    deleteSession: deleteSuggesterSession,
                    runAIFlow: runSuggester as any,
                };
        }
    }, [mode, plannerSessions, createPlannerSession, updatePlannerSession, deletePlannerSession, breakdownSessions, createBreakdownSession, updateBreakdownSession, deleteBreakdownSession, suggesterSessions, createSuggesterSession, updateSuggesterSession, deleteSuggesterSession]);


    React.useEffect(() => {
        if (activeChatId) {
          const activeSession = sessions.find(s => s.id === activeChatId);
          if (activeSession) {
            setHistory(activeSession.history);
            // Find the last plan in the history, if any
            const lastModelMessage = activeSession.history.slice().reverse().find(m => m.role === 'model');
            const planAsJson = lastModelMessage?.content.split('CURRENT PLAN:')[1];
            if (planAsJson) {
                try {
                    const parsedPlan = JSON.parse(planAsJson);
                    if (parsedPlan && Array.isArray(parsedPlan)) {
                       setCurrentPlan(parsedPlan);
                    }
                } catch(e) {
                    console.error("Could not parse plan from history", e)
                    setCurrentPlan(null);
                }
            } else {
                setCurrentPlan(null);
            }
          } else {
            setHistory([]);
            setCurrentPlan(null);
          }
        } else {
          setHistory([]);
          setCurrentPlan(null);
        }
    }, [activeChatId, sessions]);
    
     React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, loading, currentPlan]);

    const getGroupedTasks = React.useMemo(() => {
        if (!breakdownDate) return {};
        
        const selectedDateStr = format(breakdownDate, 'yyyy-MM-dd');
        
        const tasksForSelectedDate = tasks
            .filter(t => !t.completed && t.scheduledDate === selectedDateStr)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        const groupTitle = format(breakdownDate, 'PPP');
        
        const grouped: { [key: string]: Task[] } = {};
        if (tasksForSelectedDate.length > 0) {
            grouped[groupTitle] = tasksForSelectedDate;
        }
        
        return grouped;

    }, [tasks, breakdownDate]);

    const getInitialPrompt = () => {
        switch (mode) {
            case 'planner':
                return `Goal: ${prompt}`;
            case 'breakdown':
                const task = tasks.find(t => t.id === taskToBreakdown);
                return `Break down this task: "${task?.title}" (ID: ${task?.id})`;
            case 'suggester':
                return `My goal is: "${prompt}". My role is ${suggestionRole} and my mood is ${suggestionMood}. Give me some ideas.`;
            default:
                return prompt;
        }
    };
    
    const canSubmit = () => {
        if (loading) return false;
        
        // Allow submitting follow-up messages
        if (history.length > 0) {
            return prompt.trim() !== '';
        }

        // Initial submission logic
        switch (mode) {
            case 'planner':
            case 'suggester':
                return prompt.trim() !== '';
            case 'breakdown':
                return taskToBreakdown !== '';
            default:
                return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit()) return;

        setLoading(true);
        setCurrentPlan(null);

        const isFirstMessage = history.length === 0;
        const currentPrompt = isFirstMessage ? getInitialPrompt() : prompt;
        
        const newHistory: AssistantMessage[] = [...history, { role: 'user', content: currentPrompt }];
        setHistory(newHistory);
        setPrompt('');

        let currentChatId = activeChatId;

        try {
            const result: PlannerOutput = await runAIFlow({
                history: newHistory,
            });
            
            if (result) {
                if (isNewChat) {
                    const title = newHistory[0].content.substring(0, 40) + '...';
                    currentChatId = await createSession(newHistory, title);
                    setActiveChatId(currentChatId);
                }
                
                let modelContent = result.response;
                if (result.tasks && result.tasks.length > 0) {
                    const planAsJson = "\n\nCURRENT PLAN:" + JSON.stringify(result.tasks);
                    modelContent += planAsJson;
                }

                const modelResponse: AssistantMessage = { role: 'model', content: modelContent };
                const updatedHistory = [...newHistory, modelResponse];
                setHistory(updatedHistory);

                if (currentChatId) {
                    await updateSession(currentChatId, { history: updatedHistory });
                }

                if (result.tasks && result.tasks.length > 0) {
                    setCurrentPlan(result.tasks);
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
        }
    };
    
    const handleFinalize = async () => {
        if (!currentPlan) return;
        
        if (mode === 'breakdown') {
            const parentId = tasks.find(t => t.id === taskToBreakdown)?.id;
            if (parentId) {
                await handleAddSubtasks(parentId, currentPlan.map(p => ({ title: p.title })));
                toast({ title: "Subtasks Added!", description: "The new subtasks have been added to the parent task." });
            }
        } else {
            await handleAddTasks(currentPlan);
            toast({ title: 'Tasks Added!', description: 'The new tasks have been added to your list.' });
        }
        
        const planAppliedHistory = [...history, { role: 'model', content: "Okay, I've added that to your list." }];
        setHistory(planAppliedHistory);
        if (activeChatId) {
            await updateSession(activeChatId, { history: planAppliedHistory });
        }
        
        setCurrentPlan(null);
    };

    const handleNewChat = () => {
        setActiveChatId(null);
    };

    const handleSelectChat = (sessionId: string) => {
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
    
    const sortedSessions = React.useMemo(() => {
        return [...sessions].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [sessions]);


    const renderInitialInputs = () => {
        if (history.length > 0) return null;

        switch (mode) {
            case 'planner':
                return (
                    <Textarea
                        placeholder="e.g., Learn to build a website in 30 days, starting tomorrow."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={isMobile ? 2 : 3}
                        disabled={loading}
                    />
                );
            case 'breakdown':
                return (
                    <div className="space-y-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !breakdownDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {breakdownDate ? format(breakdownDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={breakdownDate} onSelect={setBreakdownDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Select onValueChange={setTaskToBreakdown} value={taskToBreakdown} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a task to break down..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(getGroupedTasks).length > 0 ? (
                                    Object.entries(getGroupedTasks).map(([group, tasksInGroup]) => (
                                        <SelectGroup key={group}>
                                            <SelectLabel>{group}</SelectLabel>
                                            {tasksInGroup.map(task => (
                                                <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))
                                ) : (
                                    <SelectItem value="no-tasks" disabled>No tasks for the selected day</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                );
            case 'suggester':
                return (
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
                            placeholder="What do you want to accomplish? (e.g., get fit)"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                );
            default:
                return null;
        }
    };


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
                <ScrollArea className="flex-grow pr-4 -mr-4 mb-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
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
                                    {msg.content.replace(/^Error: /, '').split('CURRENT PLAN:')[0]}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="bg-muted text-foreground rounded-full p-2 flex-shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
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
            
                {currentPlan && currentPlan.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/50 mb-4 flex-shrink-0 flex flex-col overflow-hidden">
                        <h4 className="font-semibold flex-shrink-0">Suggested Plan:</h4>
                        <div className="flex-grow overflow-y-auto max-h-[150px] pr-2">
                          <ul className="space-y-2 list-disc pl-5 text-sm">
                              {currentPlan.map((task, i) => (
                                  <li key={i}>
                                      {task.title}
                                      {task.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(task.scheduledDate + 'T00:00:00'), 'MMM d')}{task.scheduledTime && ` @ ${task.scheduledTime}`}</Badge>}
                                  </li>
                              ))}
                          </ul>
                        </div>
                        <Button size="sm" className="w-full mt-auto flex-shrink-0" onClick={handleFinalize}>
                            <PlusCircle className="mr-2"/> Finalize & Add to Tasks
                        </Button>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="mt-auto space-y-4 flex-shrink-0">
                    {history.length === 0 && renderInitialInputs()}

                    {history.length > 0 && (
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Need changes? Type here..."
                            disabled={loading}
                            autoFocus
                        />
                    )}
                
                    <Button type="submit" disabled={!canSubmit()} className="w-full">
                        {loading ? <Loader2 className="animate-spin" /> : history.length > 0 ? <CornerDownLeft/> : <Wand2/>}
                        <span className="ml-2">{loading ? 'Generating...' : history.length > 0 ? 'Send' : 'Generate'}</span>
                    </Button>
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
