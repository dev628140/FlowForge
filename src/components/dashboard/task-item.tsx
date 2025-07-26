
'use client';

import * as React from 'react';
import { Check, Zap, Trash2, Pencil, ArrowUp, ArrowDown, Wand2, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '@/hooks/use-toast';
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
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { ChevronDown, CornerDownRight } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import TaskList from './task-list';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { summarizeTask } from '@/ai/flows/summarize-task';
import { interactiveBreakdown } from '@/ai/flows/interactive-breakdown-flow';
import { Label } from '@/components/ui/label';


const editTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
});

type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onSwap: (taskA: Task, taskB: Task) => Promise<void>;
  isSubtask?: boolean;
  parentId?: string;
  neighborUp?: Task;
  neighborDown?: Task;
}

export default function TaskItem({ 
  task, 
  onToggle, 
  onStartFocus, 
  onUpdateTask,
  onSwap,
  isSubtask = false, 
  parentId,
  neighborUp,
  neighborDown,
}: TaskItemProps) {
  const { handleDeleteTask, handleAddSubtasks } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const { toast } = useToast();
  
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // AI states
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = React.useState(false);
  const [summary, setSummary] = React.useState('');
  const [isBreakdownDialogOpen, setIsBreakdownDialogOpen] = React.useState(false);
  const [breakdownPrompt, setBreakdownPrompt] = React.useState('');
  const [breakdownResult, setBreakdownResult] = React.useState<string[] | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);


  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description || '',
      scheduledDate: task.scheduledDate ? parseISO(task.scheduledDate) : undefined,
      scheduledTime: task.scheduledTime || '',
    },
  });

  React.useEffect(() => {
    form.reset({
      title: task.title,
      description: task.description || '',
      scheduledDate: task.scheduledDate ? parseISO(task.scheduledDate) : undefined,
      scheduledTime: task.scheduledTime || '',
    });
  }, [task, form, isEditDialogOpen]);

  const handleEditSubmit = async (values: EditTaskFormValues) => {
    const updates: Partial<Omit<Task, 'id'>> = {
        title: values.title,
        description: values.description || '',
        scheduledDate: values.scheduledDate ? format(values.scheduledDate, 'yyyy-MM-dd') : undefined,
        scheduledTime: values.scheduledTime || undefined,
    };

    await onUpdateTask(task.id, updates);
    setIsEditDialogOpen(false);
    toast({
      title: 'Task Updated',
      description: `"${values.title}" has been successfully updated.`,
    });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    onToggle(subtaskId, task.id);
  };
  
  const handleStartFocusSubtask = () => {
     toast({
      title: "Focus Mode",
      description: "Focus mode can only be started on main tasks.",
    });
  }

  const onDelete = async () => {
    await handleDeleteTask(task.id, parentId);
    toast({
      title: 'Task deleted',
      description: `"${task.title}" has been removed.`,
    });
  }

  const handleMove = (direction: 'up' | 'down') => {
    const neighbor = direction === 'up' ? neighborUp : neighborDown;
    if (neighbor) {
      onSwap(task, neighbor);
    }
  };

  const handleSummarize = async () => {
    setLoadingAI(true);
    setSummary('');
    setIsSummaryDialogOpen(true);
    try {
      const result = await summarizeTask({ taskTitle: task.title, taskDescription: task.description });
      setSummary(result.summary);
    } catch(e) {
      toast({ title: "Error", description: "Could not generate summary.", variant: "destructive" });
      setIsSummaryDialogOpen(false);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleBreakdown = async () => {
    if (!breakdownPrompt) return;
    setLoadingAI(true);
    setBreakdownResult(null);
    try {
      const result = await interactiveBreakdown({
        taskTitle: task.title,
        taskDescription: task.description,
        userPrompt: breakdownPrompt
      });
      setBreakdownResult(result.subtasks);
    } catch(e) {
      toast({ title: "Error", description: "Could not generate breakdown.", variant: "destructive" });
    } finally {
      setLoadingAI(false);
    }
  };
  
  const handleFinalizeBreakdown = async () => {
    if (!breakdownResult) return;
    const subtasks = breakdownResult.map(title => ({ title }));
    await handleAddSubtasks(task.id, subtasks);
    toast({ title: "Subtasks Added!", description: "The generated breakdown has been added to your task." });
    setIsBreakdownDialogOpen(false);
    setBreakdownPrompt('');
    setBreakdownResult(null);
  }
  
  const itemContent = (
    <div className={cn("flex items-center group p-2 rounded-md hover:bg-muted/50 transition-colors", isSubtask && "pl-6")}>
      {isSubtask && <CornerDownRight className="h-4 w-4 mr-2 text-muted-foreground" />}
       <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, parentId)}
        className="w-5 h-5 mr-4"
        aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="mr-auto">
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "font-medium transition-colors cursor-pointer",
            task.completed ? "text-muted-foreground line-through" : "text-card-foreground"
          )}
        >
          {task.title}
        </label>
        <div className="flex items-center gap-2 flex-wrap">
            {task.description && (
            <p className={cn(
                "text-xs text-muted-foreground transition-colors",
                task.completed && "line-through"
            )}>
                {task.description}
            </p>
            )}
             {hasSubtasks && (
              <Badge variant="secondary" className="text-xs font-mono">
                {completedSubtasks}/{totalSubtasks}
              </Badge>
            )}
            {task.scheduledDate && (
                <Badge variant="outline" className="text-xs">
                    {format(parseISO(task.scheduledDate), 'MMM d')}
                    {task.scheduledTime && ` at ${task.scheduledTime}`}
                </Badge>
            )}
        </div>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleMove('up')} disabled={!neighborUp}><ArrowUp className="h-4 w-4"/></Button>
                </TooltipTrigger>
                <TooltipContent><p>Move Up</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleMove('down')} disabled={!neighborDown}><ArrowDown className="h-4 w-4"/></Button>
                </TooltipTrigger>
                <TooltipContent><p>Move Down</p></TooltipContent>
            </Tooltip>
        <Tooltip>
            <TooltipTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => onStartFocus(task)}
                aria-label={`Start focus session for ${task.title}`}
                disabled={task.completed || isSubtask}
            >
                <Zap className="h-4 w-4" />
            </Button>
            </TooltipTrigger>
            <TooltipContent>
            <p>Start Focus Session</p>
            </TooltipContent>
        </Tooltip>

        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8" disabled={task.completed}>
                            <Wand2 className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent><p>AI Actions</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSummarize}>Summarize</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setBreakdownPrompt('');
                  setBreakdownResult(null);
                  setIsBreakdownDialogOpen(true);
                }}>
                  Breakdown
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        {hasSubtasks && (
        <CollapsibleTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" aria-label="Toggle subtasks" disabled={task.completed}>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:-rotate-180" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Subtasks</p>
            </TooltipContent>
          </Tooltip>
        </CollapsibleTrigger>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <Tooltip>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8" aria-label={`Edit task ${task.title}`} disabled={task.completed}>
                    <Pencil className="h-4 w-4" />
                </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
                <p>Edit Task</p>
            </TooltipContent>
            </Tooltip>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Make changes to your task here. Click save when you're done.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex gap-4">
                <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col w-1/2">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                    <FormItem className="w-1/2">
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                        <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
        </Dialog>

        <AlertDialog>
            <Tooltip>
            <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete task ${task.title}`}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
                <p>Delete Task</p>
            </TooltipContent>
            </Tooltip>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task "{task.title}"
                {hasSubtasks && " and all of its subtasks"}.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        </TooltipProvider>
      </div>
      
       {/* AI Summary Dialog */}
      <AlertDialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Summary of "{task.title}"</AlertDialogTitle>
            <AlertDialogDescription>
              {loadingAI && <Loader2 className="animate-spin my-4 mx-auto" />}
              {summary}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsSummaryDialogOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Breakdown Dialog */}
      <Dialog open={isBreakdownDialogOpen} onOpenChange={setIsBreakdownDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Interactive Breakdown</DialogTitle>
            <DialogDescription>
              Tell the AI how to break down the task: <span className="font-semibold text-foreground">"{task.title}"</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakdown-prompt" className="text-right">
                Instructions
              </Label>
              <Textarea
                id="breakdown-prompt"
                value={breakdownPrompt}
                onChange={(e) => setBreakdownPrompt(e.target.value)}
                className="col-span-3"
                placeholder="e.g., break this into 5 daily steps"
                disabled={loadingAI}
              />
            </div>
            <Button onClick={handleBreakdown} disabled={loadingAI || !breakdownPrompt}>
              {loadingAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Breakdown
            </Button>

            {breakdownResult && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Generated Subtasks:</h4>
                <ul className="list-disc list-inside bg-muted/50 p-4 rounded-md text-sm">
                  {breakdownResult.map((sub, i) => <li key={i}>{sub}</li>)}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBreakdownDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalizeBreakdown} disabled={!breakdownResult || loadingAI}>
              Add as Subtasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (hasSubtasks) {
    return (
      <Collapsible>
        {itemContent}
        <CollapsibleContent>
          <div className="pl-6 border-l-2 border-dashed ml-4">
            <TaskList
              tasks={task.subtasks!}
              onToggle={handleToggleSubtask}
              onStartFocus={handleStartFocusSubtask}
              onUpdateTask={onUpdateTask}
              onSwap={onSwap}
              isSubtaskList={true}
              parentId={task.id}
              listId={`subtasks-${task.id}`}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return itemContent;
}
