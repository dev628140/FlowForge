
'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type User } from 'firebase/auth';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface UserProfileProps {
  user: User | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useAuth();
  
  const displayName = user?.displayName || user?.email;
  const fallback = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <DropdownMenu>
       <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="text-right">
              <div className="font-semibold text-sm">{displayName}</div>
            </div>
            <Avatar>
              <AvatarImage src={user?.photoURL || undefined} alt="User profile picture" />
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
