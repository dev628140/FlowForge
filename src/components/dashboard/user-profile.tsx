
'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface UserProfileProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  userEmail?: string | null;
}

export default function UserProfile({ level, xp, xpToNextLevel, userEmail }: UserProfileProps) {
  const progressPercentage = (xp / xpToNextLevel) * 100;
  const fallback = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <div className="font-semibold text-sm">Level {level}</div>
        <div className="text-xs text-muted-foreground">{xp} / {xpToNextLevel} XP</div>
        <Progress value={progressPercentage} className="w-24 h-1.5 mt-1" />
      </div>
      <Avatar>
        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${userEmail}`} alt="User" />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  );
}
