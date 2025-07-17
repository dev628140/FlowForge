'use client';

import * as React from 'react';
import { BookOpen, Bot, Loader2 } from 'lucide-react';
import { generateLearningPlan, type LearningPlanOutput } from '@/ai/flows/learning-plan-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

export default function LearningPlanner() {
  const [topic, setTopic] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [plan, setPlan] = React.useState<LearningPlanOutput | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({
        title: 'Topic is empty',
        description: 'Please enter a topic to learn.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateLearningPlan({ topic });
      if (result.learning_plan && result.learning_plan.length > 0) {
        setPlan(result);
        toast({
          title: 'Learning plan generated!',
          description: 'Your new learning plan is ready.',
        });
      } else {
        throw new Error('No learning plan was generated.');
      }
    } catch (error) {
      console.error('Error generating learning plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate a learning plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Learning Planner</CardTitle>
        <CardDescription>Enter a topic you want to master, and AI will create a step-by-step plan for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="e.g., 'Quantum Computing' or 'How to bake sourdough bread'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Generating Plan...</span>
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                <span>Generate Learning Plan</span>
              </>
            )}
          </Button>
        </form>

        {loading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {plan && !loading && (
          <div className="mt-6 space-y-4 animate-in fade-in-50">
            <h3 className="text-lg font-semibold">Your Plan to Master "{topic}"</h3>
            <Accordion type="single" collapsible className="w-full">
              {plan.learning_plan.map((step) => (
                <AccordionItem key={step.step} value={`item-${step.step}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold">
                        {step.step}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{step.title}</p>
                        <p className="text-xs text-muted-foreground">Est. time: {step.estimated_time}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {step.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <h4 className="font-semibold text-md mt-6">Suggested Resources</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {plan.resources.map((resource, i) => (
                <li key={i}>{resource}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
