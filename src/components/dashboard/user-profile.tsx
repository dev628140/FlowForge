
'use client';

import * as React from 'react';
import { type User } from 'firebase/auth';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '../ui/button';

interface UserProfileProps {
  user: User | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useAuth();
  
  const displayName = user?.displayName || user?.email;

  return (
    <DropdownMenu>
       <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                  <UserIcon className="w-5 h-5" />
              </div>
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
