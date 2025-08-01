
'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, X, Brain, Coffee } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  task?: Task;
  onClose: () => void;
  onComplete: (taskId?: string) => void;
}

const MIN_FOCUS = 10;
const MAX_FOCUS = 60;
const MIN_BREAK = 5;
const MAX_BREAK = 30;
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

const SVG_SIZE = 215;
const STROKE_WIDTH = 15;
const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusMode({ task, onClose, onComplete }: FocusModeProps) {
  const [focusDuration, setFocusDuration] = React.useState(DEFAULT_FOCUS * 60);
  const [breakDuration, setBreakDuration] = React.useState(DEFAULT_BREAK * 60);
  const [timeLeft, setTimeLeft] = React.useState(focusDuration);
  const [isActive, setIsActive] = React.useState(false);
  const [isBreak, setIsBreak] = React.useState(false);
  
  const [autoStartBreaks, setAutoStartBreaks] = React.useState(false);
  const [autoStartFocus, setAutoStartFocus] = React.useState(false);
  const [cyclesCompleted, setCyclesCompleted] = React.useState(0);
  
  const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);
  
  // Screen Wake Lock: Keep screen on as long as this component is mounted.
  React.useEffect(() => {
    let isMounted = true;

    const acquireLock = async () => {
      if ('wakeLock' in navigator && isMounted && document.visibilityState === 'visible') {
        try {
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err: any) {
            if(err.name === 'NotAllowedError') {
              console.log("Screen Wake Lock is not allowed by the current permissions policy.");
            } else {
              console.error('Could not acquire wake lock:', err);
            }
        }
      }
    };

    const releaseLock = async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }
    
    acquireLock();
    
    const handleVisibilityChange = () => {
        if (isMounted && document.visibilityState === 'visible') {
            acquireLock();
        }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      releaseLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);


  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      const sound = isBreak ? '/sounds/success.mp3' : '/sounds/bell.mp3';
      new Audio(sound).play().catch(e => console.error("Audio play failed", e));
      
      if (isBreak) {
        setIsBreak(false);
        setTimeLeft(focusDuration);
        if (!autoStartFocus) {
          setIsActive(false);
        }
      } else {
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

  const toggleTimer = () => {
    setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(focusDuration);
  };
  
  const handleComplete = () => {
    onComplete(task?.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const duration = isBreak ? breakDuration : focusDuration;
  const progress = (timeLeft / duration);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-[31.5rem] m-4 p-6 md:p-8 text-center flex flex-col items-center relative">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close Focus Mode</span>
        </Button>
        
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
            {isBreak ? <Coffee className="h-5 w-5"/> : <Brain className="h-5 w-5" />}
            <span>{isBreak ? 'BREAK TIME' : 'FOCUSING ON'}</span>
        </div>

        {!isBreak && <h1 className="text-xl md:text-2xl font-bold font-headline mb-4 text-card-foreground">{task?.title || "Focus Session"}</h1>}
        
        <div className="relative my-4" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
            <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="-rotate-90">
                <circle
                    cx={SVG_SIZE / 2}
                    cy={SVG_SIZE / 2}
                    r={RADIUS}
                    stroke="hsl(var(--muted))"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    className="text-gray-700"
                />
                <circle
                    cx={SVG_SIZE / 2}
                    cy={SVG_SIZE / 2}
                    r={RADIUS}
                    stroke="hsl(var(--primary))"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold text-5xl text-card-foreground">{formatTime(timeLeft)}</span>
            </div>
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
           <div className="w-8 h-8" /> {/* Spacer */}
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
                onValueChange={(value) => {
                    const newDuration = value[0] * 60;
                    setFocusDuration(newDuration);
                    if (!isActive && !isBreak) {
                        setTimeLeft(newDuration);
                    }
                }}
                disabled={isActive && !isBreak}
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
                onValueChange={(value) => {
                    const newDuration = value[0] * 60;
                    setBreakDuration(newDuration);
                     if (!isActive && isBreak) {
                        setTimeLeft(newDuration);
                    }
                }}
                disabled={isActive && isBreak}
              />
            </div>
             <div className="flex flex-col sm:flex-row justify-around items-center gap-4 pt-2">
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
          {task ? "Mark as Complete" : "End Session"}
        </Button>
        <p className="text-sm text-muted-foreground mb-4">Cycles completed: {cyclesCompleted}</p>
        
      </div>
    </div>
  );
}
