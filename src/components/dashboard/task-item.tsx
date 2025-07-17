
'use client';

import * as React from 'react';
import { Check, Zap, MessageSquarePlus, Loader2, ChevronDown, CornerDownRight, Bot, Trash2 } from 'lucide-react';
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

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, parentId?: string) => void;
  onStartFocus: (task: Task) => void;
  isSubtask?: boolean;
  parentId?: string;
}

export default function TaskItem({ task, onToggle, onStartFocus, isSubtask = false, parentId }: TaskItemProps) {
  const { handleAddSubtasks, handleDeleteTask, updateTask } = useAppContext();
  const [summary, setSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [isBreakingDown, setIsBreakingDown] = React.useState(false);
  const { toast } = useToast();
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

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
    if (!task.description) {
      toast({
        title: 'No description',
        description: 'This task has no description to summarize.',
        variant: 'destructive',
      });
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeTask({ taskDescription: task.description });
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

  const onDelete = async () => {
    await handleDeleteTask(task.id, parentId);
    toast({
      title: 'Task deleted',
      description: `"${task.title}" has been removed.`,
    });
  }

  const itemContent = (
    <div className={cn("flex items-start group p-2 rounded-md hover:bg-muted/50 transition-colors", isSubtask && "pl-6")}>
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
        <div className="flex items-center gap-2">
            {task.description && (
            <p className={cn(
                "text-xs text-muted-foreground transition-colors",
                task.completed && "line-through"
            )}>
                {task.description}
            </p>
            )}
            {task.scheduledDate && (
                <Badge variant="outline" className="text-xs">
                    {format(parseISO(task.scheduledDate), 'MMM d')}
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
                  disabled={isSummarizing || !task.description}
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
              isSubtaskList={true}
              parentId={task.id}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return itemContent;
}
