
'use client';

import * as React from 'react';
import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDynamicSuggestions } from '@/ai/flows/dynamic-suggestions-flow';
import type { Task, UserRole } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface DynamicSuggestionCardProps {
  tasks: Task[];
  role: UserRole;
}

export default function DynamicSuggestionCard({ tasks, role }: DynamicSuggestionCardProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = React.useState(0);
  const { toast } = useToast();

  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDynamicSuggestions({
        tasks: tasks.map(t => ({ title: t.title, completed: t.completed })),
        role: role,
      });
      setSuggestions(result.suggestions || []);
      setCurrentSuggestionIndex(0);
    } catch (error) {
      console.error("Failed to fetch dynamic suggestions:", error);
      toast({
        title: "AI Suggestion Failed",
        description: "Could not load a suggestion. Please try again.",
        variant: "destructive",
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [tasks, role, toast]);

  React.useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextSuggestion = () => {
    setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
  };
  
  const hasSuggestions = suggestions.length > 0;
  const currentSuggestion = hasSuggestions ? suggestions[currentSuggestionIndex] : null;

  return (
    <Card className="bg-accent/20 border-accent/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" />
          Next Best Action
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchSuggestions} disabled={loading} className="h-8 w-8">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground min-h-[40px] flex items-center">
             {loading ? (
                <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
             ) : hasSuggestions ? (
                <p>"{currentSuggestion}"</p>
             ) : (
                <p>No suggestions right now. Complete a task or add a new one!</p>
             )}
        </div>
         {suggestions.length > 1 && (
            <div className="text-right mt-2">
                 <Button variant="link" size="sm" onClick={handleNextSuggestion}>
                     Next suggestion
                 </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
