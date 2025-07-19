
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, FileUp, Loader2, AlertTriangle, SwitchCamera, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MediaUploaderProps {
  onMediaSelect: (file: { dataUri: string; type: string; name: string }) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function MediaUploader({ onMediaSelect }: MediaUploaderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsCameraActive(false);
    }
  }, []);

  const startCameraStream = useCallback(async (mode: 'user' | 'environment') => {
      stopCameraStream(); // Stop any existing stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: mode }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasCameraPermission(true);
        setIsCameraActive(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setHasCameraPermission(false);
        setError("Camera access was denied. Please enable it in your browser settings.");
      }
  }, [stopCameraStream]);

  const handleTabChange = (value: string) => {
    if (value === 'camera' && hasCameraPermission !== false) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setLoading(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        onMediaSelect({ dataUri, type: 'image/jpeg', name: `capture-${Date.now()}.jpg` });
      }
      stopCameraStream();
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    if (fileRejections.length > 0) {
        const firstError = fileRejections[0].errors[0];
        if (firstError.code === 'file-too-large') {
            setError(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        } else {
            setError(firstError.message);
        }
        return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        onMediaSelect({ dataUri, type: file.type, name: file.name });
        setLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  }, [onMediaSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => stopCameraStream();
  }, [stopCameraStream]);
  
  return (
    <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload"><FileUp className="mr-2 h-4 w-4" /> Upload File</TabsTrigger>
        <TabsTrigger value="camera"><Camera className="mr-2 h-4 w-4" /> Use Camera</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <div
          {...getRootProps()}
          className={`mt-4 flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
          }`}
        >
          <input {...getInputProps()} />
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="text-center text-muted-foreground">
              <FileUp className="mx-auto h-10 w-10 mb-2" />
              <p className="font-semibold">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file or click'}
              </p>
              <p className="text-xs">PDF, DOCX, TXT, or images (up to 5MB)</p>
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="camera">
        <div className="mt-4 space-y-4">
          {hasCameraPermission === false ? (
              <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera Access Denied</AlertTitle>
                  <AlertDescription>Please enable camera permissions in your browser settings to use this feature.</AlertDescription>
              </Alert>
          ) : (
             <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                 <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                 {!isCameraActive && (
                     <div className="absolute text-center text-muted-foreground">
                         <VideoOff className="h-12 w-12 mx-auto" />
                         <p>Camera is off</p>
                     </div>
                 )}
             </div>
          )}
          <div className="flex justify-center gap-4">
             <Button onClick={handleCapturePhoto} disabled={!isCameraActive || loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2" />}
                Capture Photo
            </Button>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                    const newMode = facingMode === 'user' ? 'environment' : 'user';
                    setFacingMode(newMode);
                    startCameraStream(newMode);
                }} 
                disabled={!isCameraActive}
            >
                <SwitchCamera />
            </Button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </TabsContent>
      {error && (
        <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Tabs>
  );
}
