
'use client';

import * as React from 'react';
import {
  Bot,
  Send,
  User,
  Loader2,
  AlertTriangle,
  Camera,
  UploadCloud,
  X,
  Wand2,
  RefreshCw,
  Plus,
  MessageSquare,
  Trash2,
  Pin,
  PinOff,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '../ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { format } from 'date-fns';

export interface AgentConfig {
  title: string;
  description: string;
  initialContext: string;
  initialPrompt?: string;
  taskContext: any;
  children?: React.ReactNode;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  activeTool: { id: string; name: string } | null;
  pinned: boolean;
  createdAt: string;
}

const availableTools: { name: string; description: string; promptTemplate: string; id: string }[] = [
  { id: 'naturalLanguageTaskPlanning', name: 'Task Planner', description: 'Breaks down a goal into actionable tasks.', promptTemplate: 'Plan my goal: ' },
  { id: 'getRoleBasedTaskSuggestions', name: 'Task Suggester', description: 'Get suggestions based on your role and mood.', promptTemplate: 'I need some suggestions, I feel...' },
  { id: 'generateLearningPlan', name: 'Learning Planner', description: 'Creates a structured learning plan for any topic.', promptTemplate: 'Create a learning plan for: ' },
  { id: 'analyzeProductivity', name: 'Productivity Analyzer', description: 'Get a report on your productivity patterns.', promptTemplate: 'Analyze my productivity' },
  { id: 'progressReflectionJournal', name: 'Progress Journal', description: 'Generates a summary of your completed tasks.', promptTemplate: 'Summarize my progress for today' },
  { id: 'breakdownTask', name: 'Task Breakdown', description: 'Breaks one large task into smaller subtasks.', promptTemplate: 'Break down the task: ' },
  { id: 'visualTaskSnap', name: 'Visual Task Snap', description: 'Extracts tasks from an uploaded image.', promptTemplate: 'Get the tasks from the attached image' },
  { id: 'reorderAllTasks', name: 'Bulk Reorder', description: 'Applies today\'s task order to all other days.', promptTemplate: `Make all my other days' task order the same as today's.` },
];

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CONVERSATIONS_STORAGE_KEY = 'flowforge_conversations';
const CURRENT_CONVERSATION_ID_KEY = 'flowforge_current_conversation_id';
const HISTORY_COLLAPSED_KEY = 'flowforge_history_collapsed';


export default function ConversationalAICard({ config }: { config: AgentConfig }) {
  const { handleAddTasks, updateTask, handleDeleteTask } = useAppContext();
  const { toast } = useToast();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = React.useState(true);


  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string | null>(null);
  const [isToolPopoverOpen, setIsToolPopoverOpen] = React.useState(false);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = React.useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(true);
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string | undefined>();
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const isOffline = useOfflineStatus();

  // Load conversations and collapsed state from localStorage on mount
  React.useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      const storedId = localStorage.getItem(CURRENT_CONVERSATION_ID_KEY);
      const storedCollapsed = localStorage.getItem(HISTORY_COLLAPSED_KEY);
      
      if (storedCollapsed) {
        setIsHistoryCollapsed(JSON.parse(storedCollapsed));
      }

      if (storedConversations) {
        const parsedConvos = JSON.parse(storedConversations);
        setConversations(parsedConvos);
        
        if (storedId && parsedConvos.some((c: Conversation) => c.id === storedId)) {
          setCurrentConversationId(storedId);
        } else if (parsedConvos.length > 0) {
          setCurrentConversationId(parsedConvos[0].id);
        } else {
          startNewConversation();
        }
      } else {
        startNewConversation();
      }
    } catch (e) {
      console.error("Failed to load conversations from localStorage", e);
      startNewConversation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Save conversations to localStorage whenever they change
  React.useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    }
    if (currentConversationId) {
      localStorage.setItem(CURRENT_CONVERSATION_ID_KEY, currentConversationId);
    }
  }, [conversations, currentConversationId]);

  const toggleHistoryCollapse = () => {
    const newCollapsedState = !isHistoryCollapsed;
    setIsHistoryCollapsed(newCollapsedState);
    localStorage.setItem(HISTORY_COLLAPSED_KEY, JSON.stringify(newCollapsedState));
  };


  const currentConversation = React.useMemo(() => {
    return conversations.find(c => c.id === currentConversationId);
  }, [conversations, currentConversationId]);

  const updateCurrentConversation = React.useCallback((updates: Partial<Conversation>) => {
    if (!currentConversationId) return;
    setConversations(prev =>
      prev.map(c => (c.id === currentConversationId ? { ...c, ...updates } : c))
    );
  }, [currentConversationId]);
  
  const startNewConversation = () => {
    const newId = uuidv4();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      activeTool: null,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
    setPrompt('');
    setImage(null);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      const remainingConversations = conversations.filter(c => c.id !== id);
      if (remainingConversations.length > 0) {
        setCurrentConversationId(remainingConversations[0].id);
      } else {
        startNewConversation();
      }
    }
  };

  const togglePinConversation = (id: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };
  
  const sortedConversations = React.useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [conversations]);

  const processImage = React.useCallback(async (dataUri: string) => {
    setImage(dataUri);
    setPrompt("Get tasks from the attached image");
    updateCurrentConversation({ activeTool: {id: 'visualTaskSnap', name: 'Visual Task Snap'} });
    toast({
        title: "Image Added",
        description: "Your image has been attached. You can now ask the AI about it."
    });
  }, [toast, updateCurrentConversation]);
  
  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const dataUri = await fileToDataUri(file);
    processImage(dataUri);
    setIsImageMenuOpen(false);
  }, [processImage]);

  const { getRootProps, getInputProps, open: openFilePicker, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  React.useEffect(() => {
    const getCameraDevices = async () => {
      if (!isCameraDialogOpen) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(track => track.stop());
        setHasCameraPermission(true);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          setCurrentDeviceId(currentDeviceId || videoInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };
    getCameraDevices();
    return () => {
       if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
       }
    }
  }, [isCameraDialogOpen, currentDeviceId]);
  
  React.useEffect(() => {
    if (isCameraDialogOpen && hasCameraPermission && currentDeviceId) {
        const startStream = async () => {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: currentDeviceId } } });
                if (videoRef.current) videoRef.current.srcObject = newStream;
            } catch (error) {
                console.error("Error switching camera:", error);
                setHasCameraPermission(false);
            }
        };
        startStream();
    }
  }, [currentDeviceId, isCameraDialogOpen, hasCameraPermission]);

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
        const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        setCurrentDeviceId(videoDevices[nextIndex].deviceId);
    }
  };

  const handleSnap = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUri = canvas.toDataURL('image/jpeg');
            processImage(dataUri);
            setIsCameraDialogOpen(false);
        }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isOffline || !currentConversation) {
        if (isOffline) toast({ title: "You are offline", description: "AI features are unavailable.", variant: 'destructive' });
        return;
    }

    const userContent: Content[] = [{ text: prompt }];
    if (image) userContent.unshift({ media: { url: image } });

    const userMessage: Message = { role: 'user', content: userContent };
    
    const isFirstMessage = currentConversation.messages.length === 0;
    const newTitle = isFirstMessage ? prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '') : currentConversation.title;

    updateCurrentConversation({
      messages: [...currentConversation.messages, userMessage],
      title: newTitle,
    });

    setPrompt('');
    const currentImage = image; // Keep image for this turn
    setImage(null);
    setLoading(true);
    setError(null);

    try {
      // For reordering, we need to pass the template date
      const agentInput = {
        history: currentConversation.messages,
        prompt: prompt,
        initialContext: config.initialContext,
        taskContext: config.taskContext,
        imageDataUri: currentImage || undefined,
        activeTool: currentConversation.activeTool?.id,
      };

      if (currentConversation.activeTool?.id === 'reorderAllTasks') {
        (agentInput.taskContext as any).templateDate = format(new Date(), 'yyyy-MM-dd');
      }

      const result = await conversationalAgent(agentInput);
      
      if (!result) {
        throw new Error("I'm sorry, the AI returned an empty response. This might be due to a content filter or a temporary issue. Please try rephrasing your request.");
      }
      
      const modelMessage: Message = { role: 'model', content: [{ text: result.response }] };
      
      updateCurrentConversation({
          messages: [...currentConversation.messages, userMessage, modelMessage]
      });

      if (result.tasksToAdd && result.tasksToAdd.length > 0) {
        await handleAddTasks(result.tasksToAdd);
        toast({ title: "Tasks Added!", description: `${result.tasksToAdd.length} task(s) added.` });
      }
      if (result.tasksToUpdate && result.tasksToUpdate.length > 0) {
        for (const task of result.tasksToUpdate) {
            await updateTask(task.taskId, task.updates);
        }
        toast({ title: "Tasks Updated!", description: `${result.tasksToUpdate.length} task(s) updated.` });
      }
      if (result.tasksToDelete && result.tasksToDelete.length > 0) {
        for (const task of result.tasksToDelete) {
            await handleDeleteTask(task.taskId);
        }
        toast({ title: "Tasks Deleted!", description: `${result.tasksToDelete.length} task(s) deleted.` });
      }

    } catch (err: any) {
      console.error(`Error in ${config.title}:`, err);
      const errorMessage = err.message || "I'm sorry, something went wrong. Please try again.";
      const modelErrorMessage: Message = { role: 'model', content: [{ text: errorMessage }] };
      updateCurrentConversation({
          messages: [...currentConversation.messages, userMessage, modelErrorMessage]
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Clear the active tool after it's used
      if (currentConversation?.activeTool) {
        updateCurrentConversation({ activeTool: null });
      }
    }
  };

  const handleInitialPrompt = () => {
      if (config.initialPrompt) {
          setPrompt(config.initialPrompt);
      }
  }

  const handleToolSelect = (tool: (typeof availableTools)[0]) => {
    setPrompt(tool.promptTemplate);
    if(currentConversation) {
        updateCurrentConversation({ activeTool: { id: tool.id, name: tool.name } });
    }
    setIsToolPopoverOpen(false);
  };

  const clearActiveTool = () => {
    if(currentConversation) {
      updateCurrentConversation({ activeTool: null });
    }
    toast({
        title: "Tool Cleared",
        description: "You are now in general conversation mode.",
    })
  };

  const renderContent = (content: Content) => {
    if (content.text) return <p className="text-sm">{content.text}</p>;
    if (content.media?.url) return <Image src={content.media.url} alt="User upload" width={150} height={150} className="rounded-md object-contain border" />;
    return null;
  }

  return (
    <Card className="flex h-full w-full overflow-hidden">
      {/* This container manages the overall layout */}
      <div className="flex w-full h-full relative">
        {/* Chat History Sidebar */}
        <div
          className={cn(
            'h-full bg-muted/30 border-r z-10 transition-transform duration-300 w-64 shrink-0',
            isHistoryCollapsed ? '-translate-x-full absolute' : 'translate-x-0'
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="font-semibold text-sm px-2">Chat History</span>
              <Button variant="outline" size="sm" onClick={startNewConversation}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-2 space-y-1">
                {sortedConversations.map((convo) => (
                  <div key={convo.id} className="group relative flex items-center justify-between gap-2">
                    <Button
                      variant={currentConversationId === convo.id ? 'secondary' : 'ghost'}
                      className="h-auto py-2 flex-1 min-w-0 justify-start"
                      onClick={() => setCurrentConversationId(convo.id)}
                    >
                         <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                         <span className="truncate flex-grow text-left">{convo.title}</span>
                         {convo.pinned && <Pin className="ml-2 h-4 w-4 shrink-0 text-amber-500" />}
                    </Button>
                    <div className="shrink-0 flex items-center absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-muted group-hover:bg-muted/80 rounded-md">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePinConversation(convo.id)}>
                              {convo.pinned ? <PinOff className="h-4 w-4 text-amber-500" /> : <Pin className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{convo.pinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteConversation(convo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* This wrapper ensures the main content area resizes correctly */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Chat Area */}
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={toggleHistoryCollapse} className="h-8 w-8 flex-shrink-0">
                        {isHistoryCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isHistoryCollapsed ? 'Open History' : 'Collapse History'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div>
                  <CardTitle>{config.title}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
              </div>
              {currentConversation?.activeTool && (
                <div className="text-right">
                  <Badge variant="secondary" className="mb-1">
                    Active Tool: {currentConversation.activeTool.name}
                  </Badge>
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={clearActiveTool}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent {...getRootProps({ className: 'flex-grow flex flex-col justify-between gap-4' })}>
            <input {...getInputProps()} />
            {config.children}
            <ScrollArea className="flex-grow h-64 pr-4 -mr-4">
              <div className="space-y-4">
                {(!currentConversation || currentConversation.messages.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    {isOffline ? (
                      <span className="text-destructive">AI features are disabled while offline.</span>
                    ) : config.initialPrompt ? (
                      <>
                        <span>Start by asking a question, or try this:</span>
                        <Button variant="link" className="p-1 h-auto" onClick={handleInitialPrompt}>
                          "{config.initialPrompt}"
                        </Button>
                      </>
                    ) : (
                      <span>Type a message below to start the conversation.</span>
                    )}
                  </div>
                )}
                {currentConversation?.messages.map((message, index) => (
                  <div key={index} className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'model' && <Avatar className="w-8 h-8 border"><AvatarFallback><Bot size={16} /></AvatarFallback></Avatar>}
                    <div className={cn('p-3 rounded-lg max-w-xs md:max-w-md space-y-2', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {message.content.map((part, i) => <div key={i}>{renderContent(part)}</div>)}
                    </div>
                    {message.role === 'user' && <Avatar className="w-8 h-8 border"><AvatarFallback><User size={16} /></AvatarFallback></Avatar>}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8 border"><AvatarFallback><Bot size={16} /></AvatarFallback></Avatar>
                    <div className="p-3 rounded-lg bg-muted"><Skeleton className="h-4 w-16" /></div>
                  </div>
                )}
                {error && !isOffline && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                {isDragActive && (
                  <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                    <p className="text-primary font-bold">Drop image here</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {image && (
              <div className="relative p-2 border rounded-md self-start">
                <Image src={image} alt="Image preview" width={60} height={60} className="object-cover rounded-md" />
                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-muted rounded-full" onClick={() => setImage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Popover open={isToolPopoverOpen} onOpenChange={setIsToolPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" disabled={loading || isOffline} aria-label="Select a tool"><Wand2 /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2"><h4 className="font-medium leading-none">AI Tools</h4><p className="text-sm text-muted-foreground">Select a tool to get started with a template.</p></div>
                    <div className="grid gap-2">
                      {availableTools.map((tool) => (
                        <div key={tool.id} onClick={() => handleToolSelect(tool)} className={cn('p-2 rounded-md hover:bg-accent cursor-pointer', currentConversation?.activeTool?.id === tool.id && 'bg-accent')}>
                          <p className="font-semibold text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={isImageMenuOpen} onOpenChange={setIsImageMenuOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" disabled={loading || isOffline} aria-label="Add image"><Camera /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={openFilePicker}><UploadCloud className="mr-2" /> Upload</Button>
                  <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setIsImageMenuOpen(false)}><Camera className="mr-2" /> Take Picture</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Take a Picture</DialogTitle><DialogDescription>Line up your notes and snap a photo.</DialogDescription></DialogHeader>
                      <div className="relative">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                        {!hasCameraPermission && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                            <Alert variant="destructive" className="m-4"><AlertTitle>Camera Access Denied</AlertTitle><AlertDescription>Please enable camera permissions.</AlertDescription></Alert>
                          </div>
                        )}
                      </div>
                      <DialogFooter className="sm:justify-between">
                        {videoDevices.length > 1 && <Button variant="outline" onClick={handleSwitchCamera} disabled={!hasCameraPermission}><RefreshCw className="mr-2" /> Switch Camera</Button>}
                        <div className="ml-auto">
                          <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                          <Button onClick={handleSnap} disabled={!hasCameraPermission}>Snap Photo</Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </PopoverContent>
              </Popover>
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={isOffline ? 'Offline - AI disabled' : 'Ask me anything...'} disabled={loading || isOffline} />
              <Button type="submit" disabled={loading || isOffline}>
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </form>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
