
'use client';

import * as React from 'react';
import { Wand2 } from 'lucide-react';

import { naturalLanguageTaskPlanning } from '@/ai/flows/natural-language-task-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useAppContext } from '@/context/app-context';

export default function AITaskPlanner() {
  const { handleAddTasks } = useAppContext();
  const [goal, setGoal] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

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
    setLoading(true);
    try {
      const result = await naturalLanguageTaskPlanning({ goal });
      if (result.tasks && result.tasks.length > 0) {
        handleAddTasks(result.tasks);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Task Planner</CardTitle>
        <CardDescription>Describe a goal, and let AI break it down into actionable tasks. You can also ask it to schedule tasks over a period.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="e.g., 'Schedule these 3 tasks for the next 45 days: Solve 30 DSA problems, Complete 3 folders of Delta web development, Watch 1 Love Babbar video'"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
            rows={4}
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
