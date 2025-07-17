'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Mood = {
  emoji: string;
  label: 'High Energy' | 'Neutral' | 'Low Energy' | 'Motivated' | 'Calm' | 'Stressed';
};

const moods: Mood[] = [
  { emoji: '⚡️', label: 'High Energy' },
  { emoji: '😊', label: 'Motivated' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😫', label: 'Stressed' },
  { emoji: '😴', label: 'Low Energy' },
];

export default function MoodTracker() {
  const [selectedMood, setSelectedMood] = React.useState<string | null>('😊');

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you feeling?</CardTitle>
        <CardDescription>Log your mood to get tailored task suggestions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {moods.map(mood => (
            <button
              key={mood.label}
              onClick={() => setSelectedMood(mood.emoji)}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200',
                selectedMood === mood.emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:bg-muted'
              )}
            >
              <span className="text-3xl mb-1">{mood.emoji}</span>
              <span className="text-xs text-muted-foreground">{mood.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
