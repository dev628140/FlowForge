
'use client';

import * as React from 'react';
import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useAppContext } from '@/context/app-context';
import { getDynamicSuggestions } from '@/ai/flows/dynamic-suggestions-flow';

export default function DynamicSuggestions() {
  const { tasks } = useAppContext();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true);
    try {
      // For now, we'll hardcode a role. This could be a user setting later.
      const userRole = 'Developer';
      const result = await getDynamicSuggestions({
        tasks: tasks.map(({ title, completed, description, createdAt }) => ({ title, completed, description, createdAt })),
        role: userRole,
      });

      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error getting dynamic suggestions:', error);
      toast({
        title: 'Suggestion Error',
        description: 'Could not fetch AI suggestions. This may be due to API rate limits.',
        variant: 'destructive',
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [tasks, toast]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>For You</CardTitle>
            <CardDescription>AI-powered next best actions.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchSuggestions} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <Skeleton className="h-5 w-4/5" />
                </div>
                 <div className="flex items-start gap-3">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <Skeleton className="h-5 w-3/5" />
                </div>
            </div>
        ) : suggestions.length > 0 ? (
          <ul className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4 flex-shrink-0 mt-1 text-yellow-400" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Click the refresh button to get new suggestions.</p>
        )}
      </CardContent>
    </Card>
  );
}
