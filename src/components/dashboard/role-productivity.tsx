'use client';

import * as React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

import { getRoleBasedTaskSuggestions, RoleBasedTaskSuggestionsOutput } from '@/ai/flows/role-based-task-suggestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserRole, MoodLabel } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAppContext } from '@/context/app-context';
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';

const roles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];

interface RoleProductivityProps {
  mood: MoodLabel;
}

export default function RoleProductivity({ mood }: RoleProductivityProps) {
  const { handleAddTasks } = useAppContext();
  const [role, setRole] = React.useState<UserRole>('Developer');
  const [task, setTask] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<RoleBasedTaskSuggestionsOutput | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      toast({
        title: 'Task is empty',
        description: 'Please enter a task to get suggestions.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setSuggestions(null);
    try {
      const result = await getRoleBasedTaskSuggestions({ role, userTask: task, mood });
      setSuggestions(result);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to get suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (taskTitle: string) => {
    handleAddTasks([{ title: taskTitle }]);
    toast({
      title: 'Task Added',
      description: `"${taskTitle}" has been added to your unscheduled tasks.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotion-Adaptive Assistant</CardTitle>
        <CardDescription>Feeling stuck? Get AI suggestions tailored to your role and current mood.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={role} onValueChange={(value: UserRole) => setRole(value)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="e.g., 'learn a new framework'"
            value={task}
            onChange={e => setTask(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Getting Suggestions...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Help Me Get Started</span>
              </>
            )}
          </Button>
        </form>

        {loading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {suggestions && !loading && (
          <div className="mt-6 space-y-4 animate-in fade-in-50">
            <div>
              <h4 className="font-semibold text-sm mb-2">Suggested Next Steps:</h4>
              <ul className="space-y-1">
                {suggestions.suggestedTasks.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                        <span>{t}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleAddTask(t)}>Add</Button>
                    </li>
                ))}
              </ul>
            </div>
            <div>
                <h4 className="font-semibold text-sm">Timeboxing:</h4>
                <p className="text-sm text-muted-foreground">{suggestions.timeboxingSuggestions}</p>
            </div>
             <div>
                <h4 className="font-semibold text-sm">A Little Motivation:</h4>
                <p className="text-sm text-muted-foreground italic">"{suggestions.motivationalNudges}"</p>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
