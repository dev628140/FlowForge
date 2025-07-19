
'use client';

import * as React from 'react';
import { BrainCircuit, Bot, Upload, Lightbulb, Wand2, Loader2, PlusCircle, ListChecks, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { naturalLanguageTaskPlanning, NaturalLanguageTaskPlanningOutput } from '@/ai/flows/natural-language-task-planning';
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';
import { getRoleBasedTaskSuggestions } from '@/ai/flows/role-based-task-suggestions';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { type Mood, type UserRole, type Task } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { format, isToday, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const moods: Mood[] = [
    { emoji: '⚡️', label: 'High Energy' },
    { emoji: '😊', label: 'Motivated' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😥', label: 'Stressed' },
    { emoji: '🥱', label: 'Low Energy' },
];

const userRoles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];


export default function AIAssistantPage() {
    const { handleAddTasks, tasks, handleAddSubtasks } = useAppContext();
    const { toast } = useToast();

    // State for AI Task Planner
    const [goal, setGoal] = React.useState('');
    const [isPlanning, setIsPlanning] = React.useState(false);
    const [plannedTasks, setPlannedTasks] = React.useState<NaturalLanguageTaskPlanningOutput['tasks'] | null>(null);

    // State for Task Breakdown
    const [taskToBreakdown, setTaskToBreakdown] = React.useState('');
    const [isBreakingDown, setIsBreakingDown] = React.useState(false);
    const [breakdownDate, setBreakdownDate] = React.useState<Date | undefined>(new Date());


    // State for Role-based suggestions
    const [suggestionRole, setSuggestionRole] = React.useState<UserRole>('Developer');
    const [suggestionMood, setSuggestionMood] = React.useState<Mood['label']>('Motivated');
    const [suggestionPrompt, setSuggestionPrompt] = React.useState('');
    const [isSuggesting, setIsSuggesting] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            setFile(acceptedFiles[0]);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp'] },
        multiple: false,
    });
    
    // This state was missing, let's add it.
    const [file, setFile] = React.useState<File | null>(null);

    const groupedTasksForBreakdown = React.useMemo(() => {
        const incompleteTasks = tasks.filter(t => !t.completed);
        const groups: { [key: string]: Task[] } = {};

        incompleteTasks.forEach(task => {
            const key = task.scheduledDate ? format(parseISO(task.scheduledDate), 'yyyy-MM-dd') : 'Unscheduled';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(task);
        });
        
        // Sort tasks within each group by their order property
        for (const key in groups) {
            groups[key].sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        return groups;

    }, [tasks]);

    const getGroupTitle = (dateKey: string) => {
        if (dateKey === 'Unscheduled') return 'Unscheduled';
        const date = parseISO(dateKey);
        if (isToday(date)) return `Today, ${format(date, 'MMMM d')}`;
        return format(date, 'EEEE, MMMM d');
    }

    const filteredTaskKeys = React.useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const selectedKey = breakdownDate ? format(breakdownDate, 'yyyy-MM-dd') : null;
        
        const keysToShow = new Set<string>();

        if (groupedTasksForBreakdown[todayKey]) {
            keysToShow.add(todayKey);
        }
        if (selectedKey && groupedTasksForBreakdown[selectedKey]) {
            keysToShow.add(selectedKey);
        }
        if(groupedTasksForBreakdown['Unscheduled']) {
            keysToShow.add('Unscheduled');
        }

        return Array.from(keysToShow).sort((a,b) => {
            if (a === 'Unscheduled') return 1;
            if (b === 'Unscheduled') return -1;
            return parseISO(a).getTime() - parseISO(b).getTime();
        });

    }, [groupedTasksForBreakdown, breakdownDate]);



    const handlePlanGoal = async () => {
        if (!goal.trim()) return;
        setIsPlanning(true);
        setPlannedTasks(null);
        try {
            const result = await naturalLanguageTaskPlanning({ goal });
            if (result.tasks && result.tasks.length > 0) {
                setPlannedTasks(result.tasks);
            } else {
                toast({ title: "No tasks generated", description: "The AI couldn't generate tasks for this goal. Please try rephrasing.", variant: 'destructive' });
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error', description: e.message || 'Failed to plan goal.', variant: 'destructive' });
        } finally {
            setIsPlanning(false);
        }
    };
    
    const handleAddPlannedTasks = async () => {
        if (!plannedTasks) return;
        await handleAddTasks(plannedTasks);
        toast({ title: 'Tasks Added!', description: 'The planned tasks have been added to your list.' });
        setPlannedTasks(null);
        setGoal('');
    }

    const handleBreakdownTask = async () => {
        if (!taskToBreakdown) return;
        const task = tasks.find(t => t.id === taskToBreakdown);
        if (!task) return;

        setIsBreakingDown(true);
        try {
            const result = await breakdownTask({ taskTitle: task.title });
            if (result.subtasks && result.subtasks.length > 0) {
                await handleAddSubtasks(task.id, result.subtasks.map(title => ({ title })));
                toast({ title: 'Task broken down!', description: 'Subtasks have been added successfully.' });
            } else {
                 toast({ title: 'No subtasks generated', description: 'The AI could not break down this task.', variant: 'destructive' });
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error', description: e.message || 'Failed to break down task.', variant: 'destructive' });
        } finally {
            setIsBreakingDown(false);
            setTaskToBreakdown('');
        }
    };


    const handleGetSuggestions = async () => {
        if(!suggestionPrompt.trim()) return;
        setIsSuggesting(true);
        setSuggestions([]);
        try {
            const result = await getRoleBasedTaskSuggestions({
                role: suggestionRole,
                mood: suggestionMood,
                userTask: suggestionPrompt
            });
            setSuggestions(result.suggestedTasks);
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error', description: e.message || 'Failed to get suggestions.', variant: 'destructive' });
        } finally {
            setIsSuggesting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-2">
                <BrainCircuit className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">AI Assistant Hub</h1>
            </div>
            <p className="text-muted-foreground">Your command center for AI-powered productivity. Use these tools to plan, break down, and create tasks.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Task Planner */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wand2 /> AI Task Planner</CardTitle>
                        <CardDescription>Describe a goal, and the AI will create a step-by-step task plan for you.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col gap-4">
                        <Textarea
                            placeholder="e.g., Learn to build a website in 30 days, starting tomorrow."
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            rows={4}
                        />
                        <Button onClick={handlePlanGoal} disabled={isPlanning || !goal.trim()}>
                            {isPlanning ? <Loader2 className="animate-spin" /> : 'Generate Plan'}
                        </Button>
                        {isPlanning && <p className="text-sm text-center text-muted-foreground">AI is thinking...</p>}
                        {plannedTasks && (
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                               <h4 className="font-semibold">Suggested Plan:</h4>
                               <ul className="space-y-2 list-disc pl-5 text-sm">
                                   {plannedTasks.map((task, i) => <li key={i}>{task.title} {task.scheduledDate && <span className="text-muted-foreground text-xs">({task.scheduledDate})</span>}</li>)}
                               </ul>
                               <Button size="sm" className="w-full" onClick={handleAddPlannedTasks}>
                                   <PlusCircle className="mr-2"/> Add to My Tasks
                               </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Task Breakdown */}
                 <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks /> Task Breakdown</CardTitle>
                        <CardDescription>Select a complex task, and the AI will break it into smaller subtasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col gap-4">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !breakdownDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {breakdownDate ? format(breakdownDate, "PPP") : <span>Pick a date to filter tasks</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={breakdownDate}
                                    onSelect={setBreakdownDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Select onValueChange={setTaskToBreakdown} value={taskToBreakdown}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a task to break down..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredTaskKeys.length > 0 ? (
                                    filteredTaskKeys.map(groupKey => (
                                        <SelectGroup key={groupKey}>
                                            <SelectLabel>{getGroupTitle(groupKey)}</SelectLabel>
                                            {groupedTasksForBreakdown[groupKey].map(task => (
                                                <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))
                                ) : (
                                    <SelectItem value="no-tasks" disabled>No tasks match filter</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleBreakdownTask} disabled={isBreakingDown || !taskToBreakdown}>
                            {isBreakingDown ? <Loader2 className="animate-spin" /> : 'Break Down Task'}
                        </Button>
                         {isBreakingDown && <p className="text-sm text-center text-muted-foreground">AI is thinking...</p>}
                    </CardContent>
                </Card>


                 {/* Role-based Suggestions */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb /> Smart Suggestions</CardTitle>
                        <CardDescription>Feeling stuck? Get task ideas based on your role, mood, and current goal.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <Select onValueChange={(v: UserRole) => setSuggestionRole(v)} defaultValue={suggestionRole}>
                                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                                <SelectContent>
                                    {userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={(v: Mood['label']) => setSuggestionMood(v)} defaultValue={suggestionMood}>
                                <SelectTrigger><SelectValue placeholder="Select mood..." /></SelectTrigger>
                                <SelectContent>
                                    {moods.map(m => <SelectItem key={m.label} value={m.label}>{m.emoji} {m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input 
                            placeholder="What do you want to accomplish? (e.g., get fit)"
                            value={suggestionPrompt}
                            onChange={(e) => setSuggestionPrompt(e.target.value)}
                        />
                        <Button onClick={handleGetSuggestions} disabled={isSuggesting || !suggestionPrompt.trim()}>
                            {isSuggesting ? <Loader2 className="animate-spin" /> : 'Get Ideas'}
                        </Button>
                        {isSuggesting && <p className="text-sm text-center text-muted-foreground">AI is brainstorming...</p>}

                         {suggestions.length > 0 && (
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                               <h4 className="font-semibold">Here are some ideas:</h4>
                               <ul className="space-y-2 list-disc pl-5 text-sm">
                                   {suggestions.map((task, i) => <li key={i}>{task}</li>)}
                               </ul>
                               <Button size="sm" variant="outline" className="w-full" onClick={() => handleAddTasks(suggestions.map(s => ({ title: s })))}>
                                   <PlusCircle className="mr-2"/> Add All as New Tasks
                               </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    