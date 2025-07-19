
'use client';

import * as React from 'react';
import { BrainCircuit, Bot, User, Wand2, Loader2, PlusCircle, ListChecks, Lightbulb, CornerDownLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { type Mood, type UserRole, type Task, type AssistantMessage } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { runSpecializedAssistant, type SpecializedAssistantOutput, type AssistantMode } from '@/ai/flows/specialized-assistant-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const moods: Mood[] = [
    { emoji: '⚡️', label: 'High Energy' },
    { emoji: '😊', label: 'Motivated' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😥', label: 'Stressed' },
    { emoji: '🥱', label: 'Low Energy' },
];

const userRoles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];

interface ChatPaneProps {
    mode: AssistantMode;
}

const ChatPane: React.FC<ChatPaneProps> = ({ mode }) => {
    const { handleAddTasks, tasks, handleAddSubtasks, userRole } = useAppContext();
    const { toast } = useToast();

    const [history, setHistory] = React.useState<AssistantMessage[]>([]);
    const [prompt, setPrompt] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [currentPlan, setCurrentPlan] = React.useState<SpecializedAssistantOutput['tasks'] | null>(null);

    // State for inputs
    const [taskToBreakdown, setTaskToBreakdown] = React.useState('');
    const [suggestionRole, setSuggestionRole] = React.useState<UserRole>(userRole);
    const [suggestionMood, setSuggestionMood] = React.useState<Mood['label']>('Motivated');
    const [breakdownDate, setBreakdownDate] = React.useState<Date | undefined>(new Date());

    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

     React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, loading]);

    const getGroupedTasks = React.useMemo(() => {
        const incompleteTasks = tasks.filter(t => !t.completed);
        const grouped: { [key: string]: Task[] } = {
            Today: incompleteTasks.filter(t => t.scheduledDate && isToday(parseISO(t.scheduledDate))),
            Unscheduled: incompleteTasks.filter(t => !t.scheduledDate),
        };

        incompleteTasks.forEach(task => {
            if (task.scheduledDate && !isToday(parseISO(task.scheduledDate))) {
                const dateKey = format(parseISO(task.scheduledDate), 'PPP');
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(task);
            }
        });

        if (breakdownDate) {
            const dateKey = format(breakdownDate, 'PPP');
            if (!grouped[dateKey]) {
                 grouped[dateKey] = [];
            }
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
        if (history.length > 0) return prompt.trim() !== '';
        
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

        try {
            const result = await runSpecializedAssistant({
                mode,
                history: newHistory,
                tasks,
            });
            
            if (result) {
                const modelResponse: AssistantMessage = { role: 'model', content: result.response };
                setHistory(prev => [...prev, modelResponse]);
                if (result.tasks && result.tasks.length > 0) {
                    setCurrentPlan(result.tasks);
                }
            } else {
                 throw new Error("The AI returned an empty response.");
            }

        } catch (err: any) {
            console.error(err);
            const errorResponse: AssistantMessage = { role: 'model', content: `Error: ${err.message}` };
            setHistory(prev => [...prev, errorResponse]);
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
        
        // Reset the chat
        setHistory([]);
        setCurrentPlan(null);
        setPrompt('');
        setTaskToBreakdown('');
    };

    const renderInitialInputs = () => {
        if (history.length > 0) return null;

        switch (mode) {
            case 'planner':
                return (
                    <Textarea
                        placeholder="e.g., Learn to build a website in 30 days, starting tomorrow."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
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
                                {Object.entries(getGroupedTasks).map(([group, tasksInGroup]) => {
                                    if (tasksInGroup.length === 0 && group !== format(breakdownDate!, 'PPP')) return null;
                                    return (
                                        <SelectGroup key={group}>
                                            <SelectLabel>{group}</SelectLabel>
                                            {tasksInGroup.length > 0 ? (
                                                tasksInGroup.map(task => (
                                                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                                                ))
                                            ) : (
                                                 <SelectItem value={`no-tasks-${group}`} disabled>No tasks for this day</SelectItem>
                                            )}
                                        </SelectGroup>
                                    )
                                })}
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
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow pr-4 -mr-4 mb-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
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
                    {loading && (
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
           
            {currentPlan && currentPlan.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/50 mb-4 flex-shrink-0">
                   <h4 className="font-semibold">Suggested Plan:</h4>
                   <ScrollArea className="max-h-[150px]">
                        <ul className="space-y-2 list-disc pl-5 text-sm">
                            {currentPlan.map((task, i) => (
                                <li key={i}>
                                    {task.title}
                                    {task.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(task.scheduledDate + 'T00:00:00'), 'MMM d')}{task.scheduledTime && ` @ ${task.scheduledTime}`}</Badge>}
                                </li>
                            ))}
                        </ul>
                   </ScrollArea>
                   <Button size="sm" className="w-full" onClick={handleFinalize} disabled={loading}>
                       <PlusCircle className="mr-2"/> Finalize & Add to Tasks
                   </Button>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="mt-auto space-y-4">
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
                    {loading ? <Loader2 className="animate-spin" /> : history.length > 0 ? <CornerDownLeft/> : 'Generate'}
                    <span className="ml-2">{loading ? 'Generating...' : history.length > 0 ? 'Send' : 'Generate'}</span>
                </Button>
            </form>
        </div>
    );
};


export default function AIAssistantPage() {

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-2">
                <BrainCircuit className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">AI Assistant Hub</h1>
            </div>
            <p className="text-muted-foreground">Your command center for AI-powered productivity. Converse with the AI to plan, break down, and create tasks.</p>

            <Tabs defaultValue="planner" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planner"><Wand2 className="mr-2"/> AI Task Planner</TabsTrigger>
                    <TabsTrigger value="breakdown"><ListChecks className="mr-2"/> Task Breakdown</TabsTrigger>
                    <TabsTrigger value="suggester"><Lightbulb className="mr-2"/> Smart Suggestions</TabsTrigger>
                </TabsList>
                <Card className="mt-4">
                    <CardContent className="p-6 h-[360px]">
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
