
'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Check, Loader2, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { avatars } from '@/lib/avatars';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileFormSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.').optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function SettingsPage() {
  const { user, updateUserProfile, updateUserPassword } = useAuth();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [pictureLoading, setPictureLoading] = React.useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = React.useState(false);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | null>(user?.photoURL || null);


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  React.useEffect(() => {
    profileForm.reset({ displayName: user?.displayName || '' });
    setSelectedAvatar(user?.photoURL || null);
  }, [user, profileForm]);

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setProfileLoading(true);
    try {
      await updateUserProfile({ displayName: values.displayName || undefined });
      toast({
        title: 'Profile Updated',
        description: 'Your display name has been successfully updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };
  
  const handlePasswordUpdate = async (values: PasswordFormValues) => {
    setPasswordLoading(true);
    try {
      await updateUserPassword(values.password);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed.',
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpdate = async () => {
    if (!selectedAvatar) return;
    setPictureLoading(true);
    try {
      await updateUserProfile({ photoURL: selectedAvatar });
      toast({
        title: 'Avatar Updated',
        description: 'Your new avatar has been saved.',
      });
      setIsAvatarDialogOpen(false);
    } catch (error: any) {
       toast({
        title: 'Error updating avatar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPictureLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your name and email address.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                    <FormField
                        control={profileForm.control}
                        name="displayName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                            <Input placeholder="Your Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <Input value={user?.email || ''} disabled />
                        <FormMessage />
                    </FormItem>
                    <Button type="submit" disabled={profileLoading}>
                        {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Enter a new password below.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
                    <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                            <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                            <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Choose an avatar for your profile.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="w-32 h-32 border-2 border-primary">
                    <AvatarImage src={user?.photoURL || undefined} alt="Current avatar" />
                    <AvatarFallback className="text-4xl">
                        <UserIcon />
                    </AvatarFallback>
                </Avatar>
                
                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">Choose Avatar</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>Choose Your Avatar</DialogTitle>
                            <DialogDescription>
                                Select an avatar from the list below. Click save to apply your changes.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 py-4 max-h-[400px] overflow-y-auto">
                            {avatars.map((avatar, index) => (
                                <button
                                    key={index}
                                    className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onClick={() => setSelectedAvatar(avatar.url)}
                                >
                                    <Image
                                        src={avatar.url}
                                        alt={avatar.hint}
                                        width={80}
                                        height={80}
                                        className={cn(
                                            "rounded-full border-2 transition-all",
                                            selectedAvatar === avatar.url ? 'border-primary scale-110' : 'border-transparent'
                                        )}
                                        data-ai-hint={avatar.hint}
                                    />
                                    {selectedAvatar === avatar.url && (
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                            <Check className="h-8 w-8 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={handleAvatarUpdate} disabled={pictureLoading}>
                                {pictureLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Avatar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
