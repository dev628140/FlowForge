'use client';

import * as React from 'react';
import { BookCheck, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { progressReflectionJournal } from '@/ai/flows/progress-reflection-journal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

interface ProgressJournalProps {
  tasks: Task[];
}

export default function ProgressJournal({ tasks }: ProgressJournalProps) {
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const { toast } = useToast();

  const completedTasks = tasks.filter(task => task.completed);

  const handleReflection = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const result = await progressReflectionJournal({
        tasksCompleted: completedTasks.map(t => t.title),
      });
      if (result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error('No summary was generated.');
      }
    } catch (error) {
      console.error('Error generating reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate reflection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Journal</CardTitle>
        <CardDescription>
          Reflect on your completed tasks for a motivational boost.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleReflection}
          disabled={loading || completedTasks.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Generating Summary...</span>
            </>
          ) : (
            <>
              <BookCheck className="mr-2 h-4 w-4" />
              <span>Reflect on Today's Progress</span>
            </>
          )}
        </Button>

        {loading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {summary && !loading && (
          <div className="mt-4 rounded-md border bg-muted/50 p-4 text-sm animate-in fade-in-50">
            <p className="text-muted-foreground">{summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
