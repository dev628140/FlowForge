
'use client';

import * as React from 'react';
import { Bot, Send, User, Loader2, Sparkles, AlertTriangle, Camera, UploadCloud, X, CheckCircle, RefreshCw, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { conversationalAgent } from '@/ai/flows/conversational-agent-flow';
import type { Content, Message } from '@/lib/types/conversational-agent';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface AgentConfig {
  title: string;
  description: string;
  initialContext: string;
  initialPrompt?: string;
  taskContext: any;
  children?: React.ReactNode;
}

interface ConversationalAICardProps {
  config: AgentConfig;
}

const availableTools = [
    {
        name: 'Task Planner',
        description: 'Breaks down a high-level goal into actionable tasks.',
        promptTemplate: 'Plan my goal: ',
    },
    {
        name: 'Task Suggester',
        description: 'Get suggestions based on your role and mood.',
        promptTemplate: 'I need some suggestions, I feel...',
    },
    {
        name: 'Learning Planner',
        description: 'Creates a structured learning plan for any topic.',
        promptTemplate: 'Create a learning plan for: ',
    },
    {
        name: 'Productivity Analyzer',
        description: 'Get a report on your productivity patterns.',
        promptTemplate: 'Analyze my productivity',
    },
    {
        name: 'Progress Journal',
        description: 'Generates a summary of your completed tasks.',
        promptTemplate: 'Summarize my progress for today',
    },
    {
        name: 'Task Breakdown',
        description: 'Breaks one large task into smaller subtasks.',
        promptTemplate: 'Break down the task: ',
    },
     {
        name: 'Visual Task Snap',
        description: 'Extracts tasks from an uploaded image.',
        promptTemplate: 'Get the tasks from the attached image',
    },
];

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ConversationalAICard({ config }: ConversationalAICardProps) {
  const { handleAddTasks } = useAppContext();
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string | null>(null);
  const [isToolPopoverOpen, setIsToolPopoverOpen] = React.useState(false);
  const isOffline = useOfflineStatus();
  
  const draftKey = `agent-draft-${config.title.replace(/\s+/g, '-')}`;

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const dataUri = await fileToDataUri(file);
    setImage(dataUri);
    setPrompt("Get the tasks from the attached image");
    toast({
        title: "Image Added",
        description: "Your image has been attached. You can now ask the AI about it."
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  // Load draft from localStorage on mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setPrompt(savedDraft);
    }
  }, [draftKey]);

  // Save draft to localStorage on change
  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    localStorage.setItem(draftKey, e.target.value);
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isOffline) {
        if (isOffline) {
            toast({
                title: "You are offline",
                description: "AI features are unavailable without an internet connection.",
                variant: 'destructive',
            });
        }
        return;
    }

    const userContent: Content[] = [{ text: prompt }];
    if (image) {
      userContent.unshift({ media: { url: image } });
    }

    const userMessage: Message = { role: 'user', content: userContent };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setImage(null);
    localStorage.removeItem(draftKey);
    setLoading(true);
    setError(null);

    try {
      const result = await conversationalAgent({
        history: messages,
        prompt: prompt,
        initialContext: config.initialContext,
        taskContext: config.taskContext,
        imageDataUri: image,
      });
      
      const modelMessage: Message = { role: 'model', content: [{ text: result.response }] };
      setMessages(prev => [...prev, modelMessage]);

      if (result.tasksToAdd && result.tasksToAdd.length > 0) {
        await handleAddTasks(result.tasksToAdd);
        toast({
          title: "Tasks Added!",
          description: `${result.tasksToAdd.length} task(s) have been added to your list.`,
        });
      }

    } catch (err: any) {
      console.error(`Error in ${config.title}:`, err);
      const errorMessage = err.message || "I'm sorry, something went wrong. Please try again.";
      const modelErrorMessage: Message = { role: 'model', content: [{ text: errorMessage }] };
      setMessages(prev => [...prev, modelErrorMessage]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialPrompt = () => {
      if (config.initialPrompt) {
          setPrompt(config.initialPrompt);
          localStorage.setItem(draftKey, config.initialPrompt);
      }
  }

  const handleToolSelect = (template: string) => {
    setPrompt(template);
    setIsToolPopoverOpen(false);
  }

  const renderContent = (content: Content) => {
    if (content.text) {
        return <p className="text-sm">{content.text}</p>;
    }
    if (content.media?.url) {
        return <Image src={content.media.url} alt="User upload" width={150} height={150} className="rounded-md object-contain border" />;
    }
    return null;
  }

  return (
    <Card className="flex flex-col h-full col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent {...getRootProps({className: "flex-grow flex flex-col justify-between gap-4"})} >
        <input {...getInputProps()} />
        {config.children}
        <ScrollArea className="flex-grow h-64 pr-4 -mr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">
                    {isOffline ? (
                       <span className="text-destructive">AI features are disabled while offline.</span>
                    ) : config.initialPrompt ? (
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
                    "p-3 rounded-lg max-w-xs md:max-w-md space-y-2",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {message.content.map((part, i) => <div key={i}>{renderContent(part)}</div>)}
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
            {error && !isOffline && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {isDragActive && (
                 <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                    <p className="text-primary font-bold">Drop image here</p>
                </div>
            )}
          </div>
        </ScrollArea>

        {image && (
            <div className="relative p-2 border rounded-md">
                <Image src={image} alt="Image preview" width={60} height={60} className="object-cover rounded-md" />
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => setImage(null)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
           <Popover open={isToolPopoverOpen} onOpenChange={setIsToolPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={loading || isOffline} aria-label="Select a tool">
                        <Wand2 />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">AI Tools</h4>
                            <p className="text-sm text-muted-foreground">
                                Select a tool to get started with a template.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {availableTools.map((tool) => (
                                <div
                                    key={tool.name}
                                    onClick={() => handleToolSelect(tool.promptTemplate)}
                                    className="p-2 rounded-md hover:bg-accent cursor-pointer"
                                >
                                    <p className="font-semibold text-sm">{tool.name}</p>
                                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
          <Input
            value={prompt}
            onChange={handlePromptChange}
            placeholder={isOffline ? "Offline - AI disabled" : "Ask me anything, or drag an image here..."}
            disabled={loading || isOffline}
          />
          <Button type="submit" disabled={loading || isOffline}>
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
