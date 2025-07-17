'use client';

import * as React from 'react';
import { Check, Zap } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onStartFocus: (task: Task) => void;
}

export default function TaskItem({ task, onToggle, onStartFocus }: TaskItemProps) {
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStartFocus(task)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
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
    </div>
  );
}
