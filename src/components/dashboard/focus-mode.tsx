
'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, X, Brain, Coffee, Music, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateFocusPlaylist, FocusPlaylistOutput } from '@/ai/flows/focus-playlist-flow';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

interface FocusModeProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}

const MIN_FOCUS = 10;
const MAX_FOCUS = 60;
const MIN_BREAK = 5;
const MAX_BREAK = 30;
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;


export default function FocusMode({ task, onClose, onComplete }: FocusModeProps) {
  const [focusDuration, setFocusDuration] = React.useState(DEFAULT_FOCUS * 60);
  const [breakDuration, setBreakDuration] = React.useState(DEFAULT_BREAK * 60);
  const [timeLeft, setTimeLeft] = React.useState(focusDuration);
  const [isActive, setIsActive] = React.useState(false);
  const [isBreak, setIsBreak] = React.useState(false);
  
  const [autoStartBreaks, setAutoStartBreaks] = React.useState(false);
  const [autoStartFocus, setAutoStartFocus] = React.useState(false);
  const [cyclesCompleted, setCyclesCompleted] = React.useState(0);
  
  const [playlist, setPlaylist] = React.useState<FocusPlaylistOutput | null>(null);
  const [playlistLoading, setPlaylistLoading] = React.useState(false);


  const fetchPlaylist = async () => {
    setPlaylistLoading(true);
    setPlaylist(null);
    try {
      const result = await generateFocusPlaylist({ taskTitle: task.title });
      setPlaylist(result);
    } catch (error) {
      console.error("Failed to generate playlist:", error);
      setPlaylist(null); // Set to null on error
    } finally {
      setPlaylistLoading(false);
    }
  };


  // Update timeLeft when duration settings are changed while paused
  React.useEffect(() => {
    if (!isActive) {
      setTimeLeft(isBreak ? breakDuration : focusDuration);
    }
  }, [focusDuration, breakDuration, isBreak, isActive]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Timer reached zero while active
      const sound = isBreak ? '/sounds/success.mp3' : '/sounds/bell.mp3';
      new Audio(sound).play().catch(e => console.error("Audio play failed", e));
      
      if (isBreak) { // Break just ended
        setIsBreak(false);
        setTimeLeft(focusDuration);
        if (!autoStartFocus) {
          setIsActive(false);
        }
      } else { // Focus session just ended
        setIsBreak(true);
        setCyclesCompleted(c => c + 1);
        setTimeLeft(breakDuration);
        if (!autoStartBreaks) {
          setIsActive(false);
        }
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, autoStartBreaks, autoStartFocus, breakDuration, focusDuration]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(focusDuration);
  };
  
  const handleComplete = () => {
    onComplete();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg m-4 p-6 md:p-8 text-center flex flex-col items-center relative">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close Focus Mode</span>
        </Button>
        
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
            {isBreak ? <Coffee className="h-5 w-5"/> : <Brain className="h-5 w-5" />}
            <span>{isBreak ? 'BREAK TIME' : 'FOCUSING ON'}</span>
        </div>

        {!isBreak && <h1 className="text-xl md:text-2xl font-bold font-headline mb-4 text-card-foreground">{task.title}</h1>}
        
        <div className="font-mono font-bold text-6xl sm:text-7xl md:text-8xl text-card-foreground my-4">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={resetTimer}>
            <RotateCcw className="w-5 h-5" />
            <span className="sr-only">Reset Timer</span>
          </Button>
          <Button size="lg" className="w-24 h-16 md:w-32 md:h-16 rounded-full text-lg shadow-lg" onClick={toggleTimer}>
            {isActive ? <Pause className="w-8 h-8"/> : <Play className="w-8 h-8"/>}
            <span className="sr-only">{isActive ? 'Pause timer' : 'Start timer'}</span>

          </Button>
           <div className="w-12 h-12" /> {/* Spacer */}
        </div>
        
        <div className="w-full space-y-4 mb-6">
            <div className="space-y-3">
              <Label htmlFor="focus-duration">Focus Duration: {focusDuration / 60} mins</Label>
              <Slider
                id="focus-duration"
                min={MIN_FOCUS}
                max={MAX_FOCUS}
                step={5}
                value={[focusDuration / 60]}
                onValueChange={(value) => setFocusDuration(value[0] * 60)}
                disabled={isActive}
              />
            </div>
             <div className="space-y-3">
              <Label htmlFor="break-duration">Break Duration: {breakDuration / 60} mins</Label>
              <Slider
                id="break-duration"
                min={MIN_BREAK}
                max={MAX_BREAK}
                step={5}
                value={[breakDuration / 60]}
                onValueChange={(value) => setBreakDuration(value[0] * 60)}
                disabled={isActive}
              />
            </div>
             <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
                <div className="flex items-center space-x-2">
                    <Switch id="auto-start-breaks" checked={autoStartBreaks} onCheckedChange={setAutoStartBreaks} />
                    <Label htmlFor="auto-start-breaks">Auto-start Breaks</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="auto-start-focus" checked={autoStartFocus} onCheckedChange={setAutoStartFocus} />
                    <Label htmlFor="auto-start-focus">Auto-start Focus</Label>
                </div>
            </div>
        </div>

        <Button onClick={handleComplete} variant="secondary" className="w-full mb-4">
          Mark as Complete
        </Button>
        <p className="text-sm text-muted-foreground mb-4">Cycles completed: {cyclesCompleted}</p>
        
        <Separator className="my-4" />
        
        <div className="w-full text-left">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                <Music className="h-4 w-4" />
                Focus Music
            </h3>
            {playlistLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : playlist && playlist.youtubeVideoId ? (
                <div className="aspect-video w-full">
                    <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${playlist.youtubeVideoId}?autoplay=1&mute=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            ) : (
                 <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                        {playlist === null ? 'Click below to generate focus music.' : 'Could not generate a playlist.'}
                    </p>
                    <Button onClick={fetchPlaylist} disabled={playlistLoading} size="sm" variant="ghost">
                        {playlistLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music className="mr-2 h-4 w-4" />}
                        Generate Music
                    </Button>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
}
