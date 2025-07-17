'use client';

import * as React from 'react';
import { Check, Zap, MessageSquarePlus, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { summarizeTask } from '@/ai/flows/summarize-task';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onStartFocus: (task: Task) => void;
}

export default function TaskItem({ task, onToggle, onStartFocus }: TaskItemProps) {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const { toast } = useToast();

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

  return (
    <div className="flex items-center group p-2 rounded-md hover:bg-muted/50 transition-colors">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        className="w-5 h-5 mr-4"
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
        {task.description && (
          <p className={cn(
            "text-xs text-muted-foreground transition-colors",
            task.completed && "line-through"
          )}>
            {task.description}
          </p>
        )}
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStartFocus(task)}
                aria-label={`Start focus session for ${task.title}`}
                disabled={task.completed}
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
                    disabled={task.completed}
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
                  onClick={handleSummarize}
                  disabled={isSummarizing || !task.description}
                  size="sm"
                >
                  {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Summarize Task
                </Button>

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
      </div>
    </div>
  );
}
