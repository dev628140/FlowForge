
'use client';

import * as React from 'react';
import { Bot, Send, User, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { conversationalAgent } from '@/ai/flows/conversational-agent-flow';
import type { Message } from '@/lib/types/conversational-agent';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

export interface AgentConfig {
  title: string;
  description: string;
  initialContext: string;
  initialPrompt?: string;
  taskContext: any;
}

interface ConversationalAICardProps {
  config: AgentConfig;
}

export default function ConversationalAICard({ config }: ConversationalAICardProps) {
  const { handleAddTasks } = useAppContext();
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setError(null);

    try {
      const result = await conversationalAgent({
        history: messages,
        prompt: prompt,
        initialContext: config.initialContext,
        taskContext: config.taskContext,
      });
      
      const modelMessage: Message = { role: 'model', content: result.response };
      setMessages(prev => [...prev, modelMessage]);

      if (result.tasksToAdd && result.tasksToAdd.length > 0) {
        await handleAddTasks(result.tasksToAdd);
        toast({
          title: 'Tasks Added!',
          description: `The AI has added ${result.tasksToAdd.length} task(s) to your list.`,
        });
      }

    } catch (err) {
      console.error(`Error in ${config.title}:`, err);
      const errorMessage = "I'm sorry, something went wrong. Please try again.";
      const modelErrorMessage: Message = { role: 'model', content: errorMessage };
      setMessages(prev => [...prev, modelErrorMessage]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialPrompt = () => {
      if (config.initialPrompt) {
          setPrompt(config.initialPrompt);
      }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between gap-4">
        <ScrollArea className="flex-grow h-48 pr-4 -mr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">
                    {config.initialPrompt ? (
                        <>
                            <span>Start by asking a question, or try this suggestion:</span>
                            <Button variant="link" className="p-1 h-auto" onClick={handleInitialPrompt}>
                                "{config.initialPrompt}"
                            </Button>
                        </>
                    ) : (
                        <span>Type a message below to start the conversation.</span>
                    )}
                </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                  <Avatar className="w-8 h-8 border">
                    <AvatarFallback><Bot size={16} /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "p-3 rounded-lg max-w-xs md:max-w-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                 {message.role === 'user' && (
                  <Avatar className="w-8 h-8 border">
                     <AvatarFallback><User size={16} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {loading && (
                <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8 border">
                        <AvatarFallback><Bot size={16} /></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted">
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            )}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
