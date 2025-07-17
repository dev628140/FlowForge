
'use client';

import * as React from 'react';
import { type User } from 'firebase/auth';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface UserProfileProps {
  user: User | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useAuth();
  
  const displayName = user?.displayName || user?.email;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return <UserIcon className="w-5 h-5" />;
    
    // Check if the name is an email address
    if (name.includes('@')) {
        const emailPrefix = name.split('@')[0];
        return emailPrefix.substring(0, 2).toUpperCase();
    }
    
    const parts = name.split(' ').filter(Boolean); // split by space and remove any empty strings
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <DropdownMenu>
       <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || undefined} alt={displayName || 'User Avatar'} />
                  <AvatarFallback>
                      {getInitials(user?.displayName || user?.email)}
                  </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <div className="font-semibold text-sm">{displayName}</div>
              </div>
          </Button>
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
