
'use client';

import * as React from 'react';
import { Camera, Loader2, Wand2, AlertTriangle, Check, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { visualTaskSnap } from '@/ai/flows/visual-task-snap';
import { Skeleton } from '../ui/skeleton';

interface VisualTaskSnapProps {
  onAddTasks: (tasks: { title: string }[]) => void;
}

export default function VisualTaskSnap({ onAddTasks }: VisualTaskSnapProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    } else {
      // Stop camera stream when not open
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/png');
        setCapturedImage(dataUri);
        setIsCameraOpen(false);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setCapturedImage(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsCameraOpen(true);
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setLoading(true);
    try {
      const result = await visualTaskSnap({ imageDataUri: capturedImage });
      if (result.tasks && result.tasks.length > 0) {
        onAddTasks(result.tasks.map(title => ({ title })));
        toast({
          title: 'Tasks Extracted!',
          description: 'New tasks from your image have been added.',
        });
        setCapturedImage(null);
      } else {
        toast({
          title: 'No Tasks Found',
          description: 'The AI could not identify any tasks in the image.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Could not extract tasks from the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Task Snap</CardTitle>
        <CardDescription>Capture or upload notes and turn them into tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        {isCameraOpen ? (
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setIsCameraOpen(false)} variant="outline" className="w-full">Cancel</Button>
              <Button onClick={handleCapture} disabled={hasCameraPermission !== true} className="w-full">
                <Camera className="mr-2" /> Capture
              </Button>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured notes" className="rounded-md w-full" />
            {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <p className="text-sm text-center text-muted-foreground pt-2">Analyzing image...</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => setCapturedImage(null)} variant="outline" className="w-full">
                    <X className="mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleAnalyze} className="w-full">
                    <Check className="mr-2" /> Use Image
                  </Button>
                </div>
              )
            }
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setIsCameraOpen(true)} className="w-full">
              <Camera className="mr-2" /> Open Camera
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              <Upload className="mr-2" /> Upload Photo
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
