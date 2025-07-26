
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { interactiveBreakdown } from '@/ai/flows/interactive-breakdown-flow';
import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';

interface BreakdownTaskDialogProps {
  task: Task;
  children: React.ReactNode;
}

export function BreakdownTaskDialog({ task, children }: BreakdownTaskDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [breakdownPrompt, setBreakdownPrompt] = React.useState('');
  const [breakdownResult, setBreakdownResult] = React.useState<string[] | null>(null);

  const { handleAddSubtasks } = useAppContext();
  const { toast } = useToast();

  const handleGenerateBreakdown = async () => {
    if (!breakdownPrompt) return;
    setLoading(true);
    setBreakdownResult(null);
    try {
      const result = await interactiveBreakdown({
        taskTitle: task.title,
        taskDescription: task.description,
        userPrompt: breakdownPrompt,
      });
      setBreakdownResult(result.subtasks);
    } catch (e) {
      toast({ title: 'Error', description: 'Could not generate breakdown.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeBreakdown = async () => {
    if (!breakdownResult) return;
    const subtasks = breakdownResult.map((title) => ({ title }));
    await handleAddSubtasks(task.id, subtasks);
    toast({ title: 'Subtasks Added!', description: 'The generated breakdown has been added to your task.' });
    setIsOpen(false);
    setBreakdownPrompt('');
    setBreakdownResult(null);
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state on close
      setBreakdownPrompt('');
      setBreakdownResult(null);
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Interactive Breakdown</DialogTitle>
          <DialogDescription>
            Tell the AI how to break down: <span className="font-semibold text-foreground">"{task.title}"</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="breakdown-prompt">Instructions</Label>
            <Textarea
              id="breakdown-prompt"
              value={breakdownPrompt}
              onChange={(e) => setBreakdownPrompt(e.target.value)}
              placeholder="e.g., break this into 5 daily steps"
              disabled={loading}
            />
          </div>
          <Button onClick={handleGenerateBreakdown} disabled={loading || !breakdownPrompt}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Breakdown
          </Button>

          {breakdownResult && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Generated Subtasks:</h4>
              <ul className="list-disc list-inside bg-muted/50 p-4 rounded-md text-sm max-h-40 overflow-y-auto">
                {breakdownResult.map((sub, i) => (
                  <li key={i}>{sub}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleFinalizeBreakdown} disabled={!breakdownResult || loading}>
            Add as Subtasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
