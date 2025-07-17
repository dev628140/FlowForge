
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, GitGraph, LayoutDashboard, LogOut, Settings } from 'lucide-react';
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
import { useAppContext } from '@/context/app-context';
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { level, xp, xpToNextLevel } = useAppContext();
  const { user, loading, logout } = useAuth();

  React.useEffect(() => {
    // If firebase is configured, but we are not loading and there's no user,
    // and we're not on the login page, redirect to login.
    if (isFirebaseConfigured && !loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // If Firebase is not configured or if we are on the login page, don't render the main layout
  if (!isFirebaseConfigured || pathname === '/login') {
    return <>{children}</>;
  }

  // Show a loading screen while checking auth state
  if (loading) {
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
          <div className="flex items-center gap-2 p-2">
            <Icons.logo className="w-8 h-8 text-primary" />
            <span className="font-headline text-lg font-semibold">FlowForge</span>
          </div>
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
                 <Settings className="w-4 h-4" />
                 <span>Settings</span>
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
          <SidebarTrigger />
          <UserProfile level={level} xp={xp} xpToNextLevel={xpToNextLevel} userEmail={user?.email} />
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
