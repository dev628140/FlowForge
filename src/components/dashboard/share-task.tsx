
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/context/auth-context';
import { useAppContext } from '@/context/app-context';
import { Loader2, Send, UserPlus } from 'lucide-react';
import type { Task } from '@/lib/types';

const shareFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface ShareTaskProps {
  task: Task;
}

export default function ShareTask({ task }: ShareTaskProps) {
  const { user } = useAuth();
  const { shareTask } = useAppContext();
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: { email: '' },
  });

  const isOwner = task.userId === user?.uid;

  const handleShare = async (values: ShareFormValues) => {
    setLoading(true);
    await shareTask(task.id, values.email);
    setLoading(false);
    form.reset();
    setIsOpen(false);
  };

  if (!isOwner) {
    return null; // Only the owner can share the task
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Share task ${task.title}`}
          disabled={task.completed}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleShare)} className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Share Task</h4>
              <p className="text-sm text-muted-foreground">
                Enter an email to share this task with.
              </p>
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="collaborator@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
