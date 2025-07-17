'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitGraph, LayoutDashboard, Settings } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import UserProfile from '@/components/dashboard/user-profile';
import { Icons } from './icons';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [xp, setXp] = React.useState(20);
  const [level, setLevel] = React.useState(1);
  const xpToNextLevel = level * 50;

  React.useEffect(() => {
    const handleTaskCompletion = () => {
      setXp(prev => prev + 10);
    };
    
    // In a real app, this would be driven by a global state manager or context
    window.addEventListener('taskCompleted', handleTaskCompletion);

    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompletion);
    };
  }, []);

  React.useEffect(() => {
    if (xp >= xpToNextLevel) {
      setLevel(prev => prev + 1);
      setXp(prev => prev - xpToNextLevel);
    }
  }, [xp, xpToNextLevel]);


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Icons.logo className="w-8 h-8 text-primary" />
            <span className="font-headline text-lg font-semibold">FlowForge</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/" legacyBehavior passHref>
                <SidebarMenuButton isActive={pathname === '/'}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/integrations" legacyBehavior passHref>
                <SidebarMenuButton isActive={pathname === '/integrations'}>
                  <GitGraph />
                  <span>Integrations</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2 space-y-2">
            <Separator />
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <SidebarTrigger />
          <UserProfile level={level} xp={xp} xpToNextLevel={xpToNextLevel} />
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
