'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';

import { getRoleBasedTaskSuggestions, RoleBasedTaskSuggestionsOutput } from '@/ai/flows/role-based-task-suggestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const roles: UserRole[] = ['Student', 'Developer', 'Founder', 'Freelancer'];

export default function RoleProductivity() {
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
      const result = await getRoleBasedTaskSuggestions({ role, userTask: task });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role-Based Assistant</CardTitle>
        <CardDescription>Get AI suggestions tailored to your role.</CardDescription>
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
                <Skeleton className="h-5 w-5 mr-2 animate-spin" />
                <span>Getting Suggestions...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Get Suggestions</span>
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
            <h4 className="font-semibold text-sm">Suggested Tasks:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {suggestions.suggestedTasks.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
            <h4 className="font-semibold text-sm">Timeboxing:</h4>
            <p className="text-sm text-muted-foreground">{suggestions.timeboxingSuggestions}</p>
            <h4 className="font-semibold text-sm">Motivation:</h4>
            <p className="text-sm text-muted-foreground">{suggestions.motivationalNudges}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
