
'use client';

import * as React from 'react';
import { Check, Zap, MessageSquarePlus, Loader2, ChevronDown, CornerDownRight, Bot, Trash2, CalendarPlus, Pencil, GripVertical } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { summarizeTask } from '@/ai/flows/summarize-task';
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import TaskList from './task-list';
import { useAppContext } from '@/context/app-context';
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
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
  onMove?: (taskId: string, direction: 'up' | 'down') => void;
  isSubtask?: boolean;
  parentId?: string;
  isDraggable?: boolean;
}

export default function TaskItem({ 
  task, 
  onToggle, 
  onStartFocus, 
  onUpdateTask, 
  onMove,
  isSubtask = false, 
  parentId,
  isDraggable = false,
}: TaskItemProps) {
  const { handleAddSubtasks, handleDeleteTask } = useAppContext();
  const [summary, setSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [isBreakingDown, setIsBreakingDown] = React.useState(false);
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const [newDate, setNewDate] = React.useState<Date | undefined>(task.scheduledDate ? parseISO(task.scheduledDate) : undefined);
  const [newTime, setNewTime] = React.useState(task.scheduledTime || '');

  const { toast } = useToast();
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

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
    const updates: Partial<Task> = {
        title: values.title,
    };

    if (values.description) {
        updates.description = values.description;
    }
    if (values.scheduledDate) {
        updates.scheduledDate = format(values.scheduledDate, 'yyyy-MM-dd');
    }
    updates.scheduledTime = values.scheduledTime || undefined;

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
  
  const handleStartFocusSubtask = (subtask: Task) => {
     toast({
      title: "Focus Mode",
      description: "Focus mode can only be started on main tasks.",
    });
  }

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeTask({ 
        taskTitle: task.title,
        taskDescription: task.description 
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error summarizing task:', error);
      toast({
        title: 'Error',
        description: 'Failed to summarize the task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleBreakdown = async () => {
    setIsBreakingDown(true);
    try {
      const result = await breakdownTask({ taskTitle: task.title });
      if (result.subtasks && result.subtasks.length > 0) {
        await handleAddSubtasks(task.id, result.subtasks.map(title => ({ title })));
        toast({
          title: 'Task broken down!',
          description: 'Subtasks have been added.',
        });
      } else {
        toast({
          title: 'Could not break down task',
          description: 'The AI could not generate subtasks for this item.',
          variant: 'destructive',
        });
      }
    } catch (error) {
       console.error('Error breaking down task:', error);
      toast({
        title: 'Error',
        description: 'Failed to break down the task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBreakingDown(false);
    }
  }
  
  const handleScheduleSave = async () => {
      if (!newDate) {
          toast({
              title: "No Date Selected",
              description: "Please select a date to schedule the task.",
              variant: 'destructive'
          });
          return;
      }

      const updates: Partial<Task> = {
          scheduledDate: format(newDate, 'yyyy-MM-dd'),
          scheduledTime: newTime || undefined,
      };

      await onUpdateTask(task.id, updates);
      setIsSchedulePopoverOpen(false);
      toast({
          title: 'Task Scheduled',
          description: `"${task.title}" has been scheduled.`,
      });
  };


  const onDelete = async () => {
    await handleDeleteTask(task.id, parentId);
    toast({
      title: 'Task deleted',
      description: `"${task.title}" has been removed.`,
    });
  }
  
  const itemContent = (
    <div className={cn("flex items-center group p-2 rounded-md hover:bg-muted/50 transition-colors", isSubtask && "pl-6")}>
      {isDraggable && !task.completed && (
        <div className="flex flex-col items-center mr-2">
           <Button variant="ghost" size="icon" className="h-5 w-5 cursor-grab" onClick={() => onMove?.(task.id, 'up')} aria-label="Move up">
                <GripVertical className="h-4 w-4" />
            </Button>
        </div>
      )}
      {isSubtask && <CornerDownRight className="h-4 w-4 mr-2 mt-1.5 text-muted-foreground" />}
       <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, parentId)}
        className="w-5 h-5 mr-4 mt-1"
        aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="flex-1">
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
      <div className={cn(
          "flex items-center transition-opacity", 
          "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      )}>
        {hasSubtasks && (
           <CollapsibleTrigger asChild>
             <Button variant="ghost" size="icon" aria-label="Toggle subtasks">
               <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:-rotate-180" />
             </Button>
           </CollapsibleTrigger>
        )}
        {!task.scheduledDate && !isSubtask && (
            <Popover open={isSchedulePopoverOpen} onOpenChange={setIsSchedulePopoverOpen}>
              <PopoverTrigger asChild>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Schedule task ${task.title}`}>
                                <CalendarPlus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Schedule Task</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus />
                    <div className="p-2 border-t space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="time" className="text-xs font-medium">Time (optional)</Label>
                        <Input id="time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                      </div>
                      <Button onClick={handleScheduleSave} size="sm" className="w-full">Save</Button>
                    </div>
                </PopoverContent>
            </Popover>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
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
        </TooltipProvider>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Edit task ${task.title}`} disabled={isSubtask}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Task</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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


        <Popover onOpenChange={() => setSummary(null)}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`AI actions for ${task.title}`}
                    disabled={task.completed || isSubtask}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI Assistant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">AI Assistant</h4>
                <p className="text-sm text-muted-foreground">
                  What would you like to do with this task?
                </p>
              </div>
              <div className="grid gap-2">
                <Button 
                  onClick={handleBreakdown}
                  disabled={isBreakingDown}
                  size="sm"
                  variant="outline"
                >
                  {isBreakingDown ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Break Down Task
                </Button>
                <Button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  size="sm"
                  variant="outline"
                >
                  {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Summarize Task
                </Button>

                {(isSummarizing || isBreakingDown) && <Separator className="my-2"/>}

                {isSummarizing && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Generating summary...
                    </div>
                )}

                {summary && (
                   <Card className="mt-2 bg-muted/50">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                      {summary}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <AlertDialog>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive"
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
          </TooltipProvider>
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
      </div>
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
