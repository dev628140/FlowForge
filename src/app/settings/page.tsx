
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
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';
import Image from 'next/image';

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
  const { user, updateUserProfile, updateUserPassword, updateUserProfilePicture } = useAuth();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [avatarPrompt, setAvatarPrompt] = React.useState('');
  const [generatedAvatar, setGeneratedAvatar] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [updatingPicture, setUpdatingPicture] = React.useState(false);

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

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) {
        toast({ title: "Prompt is empty", description: "Please enter a description for your avatar.", variant: "destructive"});
        return;
    }
    setGenerating(true);
    setGeneratedAvatar(null);
    try {
        const result = await generateAvatar({ prompt: avatarPrompt });
        setGeneratedAvatar(result.imageDataUri);
    } catch (error: any) {
        toast({
            title: 'Avatar Generation Failed',
            description: error.message || "Could not generate an avatar. Please try again.",
            variant: 'destructive',
        });
    } finally {
        setGenerating(false);
    }
  };

  const handleSetAvatar = async () => {
    if (!generatedAvatar) return;
    setUpdatingPicture(true);
    try {
        const blob = await (await fetch(generatedAvatar)).blob();
        const file = new File([blob], "avatar.png", { type: "image/png" });

        await updateUserProfilePicture(file);
        setGeneratedAvatar(null);
        setAvatarPrompt('');
        toast({
            title: 'Avatar Updated!',
            description: 'Your new profile picture has been set.',
        });
    } catch (error: any) {
        toast({
            title: 'Failed to Set Avatar',
            description: error.message || 'There was a problem updating your picture.',
            variant: 'destructive',
        });
    } finally {
        setUpdatingPicture(false);
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>AI Avatar Generator</CardTitle>
                <CardDescription>Describe your desired avatar and let AI create it for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                        placeholder="e.g., A cute robot reading a book, studio lighting"
                        value={avatarPrompt}
                        onChange={(e) => setAvatarPrompt(e.target.value)}
                        disabled={generating || updatingPicture}
                    />
                    <Button onClick={handleGenerateAvatar} disabled={generating || updatingPicture} className="w-full sm:w-auto">
                        {generating ? (
                            <Loader2 className="mr-2 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2" />
                        )}
                        Generate
                    </Button>
                </div>
                
                {generating && (
                    <div className="flex justify-center items-center p-8 bg-muted rounded-md">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                
                {generatedAvatar && (
                    <div className="space-y-4 text-center">
                        <Image 
                            src={generatedAvatar}
                            alt="AI generated avatar"
                            width={256}
                            height={256}
                            className="rounded-lg mx-auto border shadow-md"
                        />
                         <Button onClick={handleSetAvatar} disabled={updatingPicture}>
                            {updatingPicture ? (
                                <Loader2 className="mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2" />
                            )}
                            Set as Profile Picture
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
