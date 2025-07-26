
'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { summarizeTask } from '@/ai/flows/summarize-task';
import type { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SummarizeTaskDialogProps {
  task: Task;
  children: React.ReactNode;
}

export function SummarizeTaskDialog({ task, children }: SummarizeTaskDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState('');
  const { toast } = useToast();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && !summary) { // Only fetch if opening and summary is not already loaded
      setLoading(true);
      try {
        const result = await summarizeTask({ taskTitle: task.title, taskDescription: task.description });
        setSummary(result.summary);
      } catch (e) {
        toast({ title: 'Error', description: 'Could not generate summary.', variant: 'destructive' });
        setIsOpen(false); // Close dialog on error
      } finally {
        setLoading(false);
      }
    } else if (!open) {
        // Reset summary when closing so it refetches next time
        setSummary('');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>AI Summary of "{task.title}"</AlertDialogTitle>
          <AlertDialogDescription className="py-4 min-h-[6rem] flex items-center justify-center">
            {loading ? (
              <span className="flex justify-center items-center">
                <Loader2 className="animate-spin" />
              </span>
            ) : (
              summary
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setIsOpen(false)}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
