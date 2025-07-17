'use client';

import * as React from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { analyzeProductivity } from '@/ai/flows/productivity-dna-tracker';
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
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ProductivityDNATrackerProps {
  tasks: Task[];
}

export default function ProductivityDNATracker({ tasks }: ProductivityDNATrackerProps) {
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<string | null>(null);
  const { toast } = useToast();

  const getCompletedTasks = (tasks: Task[]): { title: string; completedAt: string }[] => {
    let completed: { title: string; completedAt: string }[] = [];
    tasks.forEach(task => {
      if (task.completed && task.completedAt) {
        completed.push({ title: task.title, completedAt: task.completedAt });
      }
      if (task.subtasks) {
        // Recursively get completed subtasks
        task.subtasks.forEach(subtask => {
            if(subtask.completed && subtask.completedAt) {
                completed.push({ title: subtask.title, completedAt: subtask.completedAt });
            }
        });
      }
    });
    return completed;
  };

  const completedTasks = getCompletedTasks(tasks);

  const handleAnalysis = async () => {
    setLoading(true);
    setReport(null);
    try {
      const result = await analyzeProductivity({
        tasks: completedTasks,
      });
      if (result.report) {
        setReport(result.report);
      } else {
        throw new Error('No report was generated.');
      }
    } catch (error) {
      console.error('Error analyzing productivity:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze productivity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productivity DNA</CardTitle>
        <CardDescription>
          Discover your peak productivity times and habits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleAnalysis}
          disabled={loading || completedTasks.length < 3}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" />
              <span>Analyze My Productivity</span>
            </>
          )}
        </Button>
        {completedTasks.length < 3 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Complete at least 3 tasks to enable analysis.</p>
        )}

        {loading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {report && !loading && (
          <Alert className="mt-4">
             <AlertTitle>Your Productivity Report</AlertTitle>
             <AlertDescription>
                <div
                    className="prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br />') }}
                />
             </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
