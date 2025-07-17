
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
  const [loading, setLoading] = React.useState(false);
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
    } catch (error: any) {
      console.error("Failed to fetch dynamic suggestions:", error);
      const errorMessage = error.message.includes('429') 
        ? "AI daily limit reached. Please try again tomorrow." 
        : "Could not load a suggestion. Please try again.";
      toast({
        title: "AI Suggestion Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [tasks, role, toast]);

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
                <p>Click the refresh icon to get a new suggestion from the AI.</p>
             )}
        </div>
         {suggestions.length > 1 && !loading && (
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
