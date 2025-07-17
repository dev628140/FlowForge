
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
import { Camera, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [pictureLoading, setPictureLoading] = React.useState(false);

  const [isCameraDialogOpen, setIsCameraDialogOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(true);
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string | undefined>();
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      if (values.displayName) {
        await updateUserProfile(values.displayName);
      }
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
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
  
  const processImageFile = async (file: File) => {
    setPictureLoading(true);
    try {
      const image = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = (err) => reject(new Error('Image failed to load.'));
        image.src = imageUrl;
      });
      
      URL.revokeObjectURL(imageUrl);

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 512;
      const MAX_HEIGHT = 512;
      let { width, height } = loadedImage;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      ctx.drawImage(loadedImage, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      if (!blob) {
        throw new Error('Canvas to Blob conversion failed');
      }

      const optimizedFile = new File([blob], "profile-photo.jpg", {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      await updateUserProfilePicture(optimizedFile);
      toast({
        title: 'Profile Picture Updated',
        description: 'Your new avatar has been saved.',
      });
      
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Could not process the image.',
        variant: 'destructive',
      });
    } finally {
      setPictureLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleSnap = async () => {
    if (videoRef.current && canvasRef.current) {
        setPictureLoading(true);
        setIsCameraDialogOpen(false); // Close dialog first to provide feedback
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                    await processImageFile(file); // This will set loading to false
                } else {
                    setPictureLoading(false);
                    toast({ title: "Capture Failed", description: "Could not create an image from the camera.", variant: "destructive" });
                }
            }, 'image/jpeg');
        } else {
           setPictureLoading(false);
           toast({ title: "Capture Failed", description: "Could not get canvas context.", variant: "destructive" });
        }
    }
  };

  React.useEffect(() => {
    const getCameraDevices = async () => {
      if (!isCameraDialogOpen) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just needed for permission
        setHasCameraPermission(true);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          setCurrentDeviceId(videoInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };
    getCameraDevices();
    return () => {
       if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
       }
    }
  }, [isCameraDialogOpen]);
  
  React.useEffect(() => {
    let stream: MediaStream;
    const startStream = async () => {
      if (isCameraDialogOpen && hasCameraPermission && currentDeviceId) {
          if (videoRef.current?.srcObject) {
              (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          }
          try {
              stream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: currentDeviceId } }
              });
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
              }
          } catch (error) {
              console.error("Error starting camera stream:", error);
              setHasCameraPermission(false);
          }
      }
    };
    startStream();
    return () => {
        stream?.getTracks().forEach(track => track.stop());
    }
  }, [currentDeviceId, isCameraDialogOpen, hasCameraPermission]);

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
        const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        setCurrentDeviceId(videoDevices[nextIndex].deviceId);
    }
  };

  const displayName = user?.displayName || user?.email;
  const fallback = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your avatar. This will be visible to you across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20 text-3xl">
                <AvatarImage src={user?.photoURL || undefined} alt="User profile picture" />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              {pictureLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={pictureLoading}>
                    <UploadCloud className="mr-2" />
                    Upload Photo
                </Button>
                <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={pictureLoading}>
                            <Camera className="mr-2"/> Take Picture
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Take a Picture</DialogTitle>
                        </DialogHeader>
                        <div className="relative">
                           <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                           <canvas ref={canvasRef} className="hidden" />
                           {!hasCameraPermission && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                    <Alert variant="destructive" className="m-4">
                                      <AlertTitle>Camera Access Denied</AlertTitle>
                                      <AlertDescription>
                                        Please enable camera permissions in your browser settings.
                                      </AlertDescription>
                                    </Alert>
                               </div>
                           )}
                        </div>
                        <DialogFooter className="sm:justify-between">
                            {videoDevices.length > 1 ? (
                                <Button variant="outline" onClick={handleSwitchCamera} disabled={!hasCameraPermission}>
                                   <RefreshCw className="mr-2" /> Switch Camera
                                </Button>
                            ) : <div />}
                            <div className="flex gap-2">
                                 <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleSnap} disabled={!hasCameraPermission}>
                                  Snap Photo
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

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
  );
}

