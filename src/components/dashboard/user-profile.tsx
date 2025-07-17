'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UserProfileProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export default function UserProfile({ level, xp, xpToNextLevel }: UserProfileProps) {
  const progressPercentage = (xp / xpToNextLevel) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <div className="font-semibold text-sm">Level {level}</div>
        <div className="text-xs text-muted-foreground">{xp} / {xpToNextLevel} XP</div>
        <Progress value={progressPercentage} className="w-24 h-1.5 mt-1" />
      </div>
      <Avatar>
        <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="avatar profile" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </div>
  );
}
