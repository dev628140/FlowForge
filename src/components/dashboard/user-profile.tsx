
'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { type User } from 'firebase/auth';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface UserProfileProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  user: User | null;
}

export default function UserProfile({ level, xp, xpToNextLevel, user }: UserProfileProps) {
  const { logout } = useAuth();
  const progressPercentage = (xp / xpToNextLevel) * 100;
  
  const displayName = user?.displayName || user?.email;
  const fallback = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <DropdownMenu>
       <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="text-right">
              <div className="font-semibold text-sm">{displayName}</div>
              <div className="text-xs text-muted-foreground">Level {level} &middot; {xp} / {xpToNextLevel} XP</div>
              <Progress value={progressPercentage} className="w-24 h-1.5 mt-1" />
            </div>
            <Avatar>
              <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} alt="User" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </div>
       </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
           <Link href="/settings">
            <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
