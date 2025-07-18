
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, GitGraph, LayoutDashboard, LogOut, Settings, ListTodo, User as UserIcon, WifiOff } from 'lucide-react';
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
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/context/auth-context';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from './ui/toaster';
import { useOfflineStatus } from '@/hooks/use-offline-status';

const LAST_VISITED_PAGE_KEY = 'flowforge_last_visited_page';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isOffline = useOfflineStatus();

  // If Firebase is not configured, we only ever render the login page,
  // which will show instructions.
  if (!isFirebaseConfigured) {
    if (pathname !== '/login') {
      router.push('/login');
      return ( // Return a loading state while redirecting
          <div className="flex h-screen w-full items-center justify-center">
             <Icons.logo className="w-12 h-12 animate-pulse text-primary" />
          </div>
      );
    }
    return <>{children}</>;
  }
  
  React.useEffect(() => {
    // If online, save the current path.
    if (!isOffline && pathname !== '/login') {
      localStorage.setItem(LAST_VISITED_PAGE_KEY, pathname);
    }
  }, [pathname, isOffline]);

  React.useEffect(() => {
    // If we are not loading and there's no user,
    // and we're not on the login page, redirect to login.
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // Don't render the layout on the login page.
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // Show a loading screen while checking auth state or if there's no user (and not on login page)
  if (loading || !user) {
    // If we are offline and loading, try to route to last known page.
    if (isOffline && !user) {
       const lastPage = localStorage.getItem(LAST_VISITED_PAGE_KEY);
       if(lastPage && lastPage !== pathname) {
         router.replace(lastPage);
       }
    }
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Icons.logo className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 p-2">
            <Icons.logo className="w-8 h-8 text-primary" />
            <span className="font-headline text-lg font-semibold">FlowForge</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive={pathname === '/'}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/all-tasks">
                <SidebarMenuButton isActive={pathname === '/all-tasks'}>
                  <ListTodo />
                  <span>All Tasks</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/schedule">
                <SidebarMenuButton isActive={pathname === '/schedule'}>
                  <Calendar />
                  <span>Schedule</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/integrations">
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
            <div className="flex items-center justify-between p-2">
               <div className="flex items-center gap-2 text-sm">
                 <Link href="/settings" className="flex items-center gap-2">
                   <Settings className="w-4 h-4" />
                   <span>Settings</span>
                 </Link>
               </div>
               <ThemeToggle />
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <LogOut className="mr-2" /> Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be returned to the login page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => logout()}>Log Out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            {isOffline && (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-pulse">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
          <UserProfile user={user} />
        </header>
        <main>{children}</main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
