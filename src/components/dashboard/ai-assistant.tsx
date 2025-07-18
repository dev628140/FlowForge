'use client';

import * as React from 'react';
import { Wand2, Loader2, Sparkles, AlertTriangle, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import type { Task, UserRole } from '@/lib/types';
import { runAssistant, type AssistantOutput } from '@/ai/flows/assistant-flow';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';

interface AIAssistantProps {
  allTasks: Task[];
  role: UserRole;
}

export default function AIAssistant({ allTasks, role }: AIAssistantProps) {
  const { handleAddTasks, updateTask, handleDeleteTask } = useAppContext();
  const { toast } = useToast();
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aiPlan, setAiPlan] = React.useState<AssistantOutput | null>(null);
  const isOffline = useOfflineStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isOffline) {
      if (isOffline) toast({ title: 'You are offline', description: 'AI features are unavailable.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setError(null);
    setAiPlan(null);

    try {
      const result = await runAssistant({
        prompt,
        tasks: allTasks,
        role,
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      if (!result) {
        throw new Error("I received an unexpected response from the AI. It might have been empty or in the wrong format. Could you please try rephrasing your request?");
      }

      // Check if there are any actions to take. If not, just show the response as a simple message.
      const hasActions = (result.tasksToAdd && result.tasksToAdd.length > 0) ||
                         (result.tasksToUpdate && result.tasksToUpdate.length > 0) ||
                         (result.tasksToDelete && result.tasksToDelete.length > 0);

      if (hasActions) {
        setAiPlan(result);
      } else {
         toast({ title: 'AI Assistant', description: result.response });
         setPrompt('');
      }

    } catch (err: any) {
      console.error('Error in AI Assistant:', err);
      setError(err.message || "I'm sorry, something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!aiPlan) return;

    setLoading(true);
    try {
      // Create a promise array to run all updates in parallel
      const promises = [];
      if (aiPlan.tasksToAdd && aiPlan.tasksToAdd.length > 0) {
        promises.push(handleAddTasks(aiPlan.tasksToAdd));
      }
      if (aiPlan.tasksToUpdate && aiPlan.tasksToUpdate.length > 0) {
        for (const task of aiPlan.tasksToUpdate) {
          promises.push(updateTask(task.taskId, task.updates));
        }
      }
      if (aiPlan.tasksToDelete && aiPlan.tasksToDelete.length > 0) {
        for (const task of aiPlan.tasksToDelete) {
          promises.push(handleDeleteTask(task.taskId));
        }
      }
      
      await Promise.all(promises);
      
      toast({
        title: 'Plan Applied!',
        description: 'Your tasks have been updated successfully.',
      });

    } catch (error) {
       console.error("Error applying AI plan:", error);
       toast({ title: "Error Applying Plan", description: "Could not apply all parts of the AI plan. Please check your tasks.", variant: "destructive" });
    } finally {
        setAiPlan(null);
        setPrompt('');
        setLoading(false);
    }
  };

  const handleDiscardPlan = () => {
    setAiPlan(null);
    setError(null);
    setPrompt('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          FlowForge Assistant
        </CardTitle>
        <CardDescription>
          Tell me what to do. Example: "Add a task to read for 1 hour tomorrow at 10am" or "Mark 'finish report' as complete".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-4">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isOffline ? 'Offline - AI disabled' : 'Your command...'}
            disabled={loading || isOffline}
          />
          <Button type="submit" disabled={loading || isOffline || !prompt.trim()}>
            {loading && !aiPlan ? <Loader2 className="animate-spin" /> : <Sparkles />}
            <span className="sr-only">Generate Plan</span>
          </Button>
        </form>

        {loading && !aiPlan && (
             <div className="text-sm text-muted-foreground flex items-center gap-2 p-4 border rounded-md">
                <Loader2 className="animate-spin w-4 h-4"/>
                <span>AI is thinking...</span>
            </div>
        )}

        {error && (
            <div className="p-4 border rounded-md bg-destructive/10 text-destructive-foreground">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Error</h4>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        )}

        {aiPlan && (
            <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                <div>
                  <h4 className="font-semibold mb-2">Here's the plan:</h4>
                  <p className="text-sm text-muted-foreground italic mb-4">"{aiPlan.response}"</p>
                </div>

                <div className="space-y-3 text-sm">
                    {aiPlan.tasksToAdd && aiPlan.tasksToAdd.length > 0 && (
                        <div>
                            <p className="font-medium text-green-600 dark:text-green-400">Add:</p>
                            <ul className="list-disc pl-5 text-muted-foreground">
                                {aiPlan.tasksToAdd.map((t, i) => (
                                    <li key={`add-${i}`}>
                                        {t.title}
                                        {t.scheduledDate && <Badge variant="outline" size="sm" className="ml-2">{format(parseISO(t.scheduledDate + 'T00:00:00'), 'MMM d')}{t.scheduledTime && ` @ ${t.scheduledTime}`}</Badge>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {aiPlan.tasksToUpdate && aiPlan.tasksToUpdate.length > 0 && (
                        <div>
                            <p className="font-medium text-amber-600 dark:text-amber-400">Update:</p>
                            <ul className="list-disc pl-5 text-muted-foreground">
                                {aiPlan.tasksToUpdate.map((t, i) => {
                                    const originalTask = allTasks.find(task => task.id === t.taskId);
                                    const updates = Object.entries(t.updates)
                                        .map(([key, value]) => {
                                            if (key === 'completed') return value ? 'Mark as complete' : 'Mark as incomplete';
                                            return `${key.charAt(0).toUpperCase() + key.slice(1)} to "${value}"`
                                        })
                                        .join(', ');
                                    return <li key={`update-${i}`}>"{originalTask?.title || 'A task'}": {updates}</li>
                                })}
                            </ul>
                        </div>
                    )}
                     {aiPlan.tasksToDelete && aiPlan.tasksToDelete.length > 0 && (
                        <div>
                            <p className="font-medium text-red-600 dark:text-red-500">Delete:</p>
                            <ul className="list-disc pl-5 text-muted-foreground">
                                {aiPlan.tasksToDelete.map((t, i) => <li key={`delete-${i}`}>"{allTasks.find(task => task.id === t.taskId)?.title || 'A task'}"</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={handleDiscardPlan} disabled={loading}><X className="mr-2"/> Discard</Button>
                    <Button onClick={handleApplyPlan} disabled={loading}>
                        {loading && <Loader2 className="animate-spin mr-2"/>}
                        <Check className="mr-2"/> Apply Plan
                    </Button>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
