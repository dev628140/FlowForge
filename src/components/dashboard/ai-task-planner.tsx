'use client';

import * as React from 'react';
import { Wand2 } from 'lucide-react';
import { useActions } from '@genkit-ai/next/use-actions';

import { naturalLanguageTaskPlanning } from '@/ai/flows/natural-language-task-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

interface AITaskPlannerProps {
  onAddTasks: (tasks: { title: string }[]) => void;
}

export default function AITaskPlanner({ onAddTasks }: AITaskPlannerProps) {
  const [goal, setGoal] = React.useState('');
  const { toast } = useToast();
  const { run: planTasks, loading } = useActions(naturalLanguageTaskPlanning);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      toast({
        title: 'Goal is empty',
        description: 'Please enter a goal to plan.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await planTasks({ goal });
      if (result.tasks && result.tasks.length > 0) {
        onAddTasks(result.tasks.map(title => ({ title })));
        toast({
          title: 'Tasks generated!',
          description: 'Your new tasks have been added to the list.',
        });
        setGoal('');
      } else {
        throw new Error('No tasks were generated.');
      }
    } catch (error) {
      console.error('Error planning tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate tasks. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Task Planner</CardTitle>
        <CardDescription>Describe a goal, and let AI break it down into actionable tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="e.g., 'Get fit this month' or 'Launch my side project in 30 days'"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
            rows={3}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Skeleton className="h-5 w-5 mr-2" />
                <span>Planning...</span>
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                <span>Generate Tasks</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
