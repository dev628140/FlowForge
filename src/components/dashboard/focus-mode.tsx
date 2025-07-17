'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface FocusModeProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}

const FOCUS_DURATION = 25 * 60; // 25 minutes

export default function FocusMode({ task, onClose, onComplete }: FocusModeProps) {
  const [timeLeft, setTimeLeft] = React.useState(FOCUS_DURATION);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Handle timer completion
      new Audio('/sounds/bell.mp3').play().catch(e => console.log("Audio play failed", e));
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(FOCUS_DURATION);
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md m-4 p-8 text-center flex flex-col items-center">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close Focus Mode</span>
        </Button>
        <h2 className="text-sm font-semibold text-primary mb-2">FOCUSING ON</h2>
        <h1 className="text-2xl font-bold font-headline mb-8 text-card-foreground">{task.title}</h1>
        
        <div className="font-mono font-bold text-7xl text-card-foreground mb-8">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={resetTimer}>
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button size="lg" className="w-32 h-16 rounded-full text-lg" onClick={toggleTimer}>
            {isActive ? <Pause className="w-8 h-8"/> : <Play className="w-8 h-8"/>}
          </Button>
           <div className="w-12 h-12" /> {/* Spacer */}
        </div>

        <Button onClick={handleComplete} variant="secondary" className="w-full">
          Mark as Complete
        </Button>
      </div>
    </div>
  );
}
