
'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Loader2, UploadCloud, X, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { visualTaskSnap } from '@/ai/flows/visual-task-snap';
import Image from 'next/image';

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VisualTaskSnapCard() {
  const { handleAddTasks } = useAppContext();
  const { toast } = useToast();
  const [image, setImage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [extractedTasks, setExtractedTasks] = React.useState<string[]>([]);
  
  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setExtractedTasks([]);
    try {
      const dataUri = await fileToDataUri(file);
      setImage(dataUri);

      const result = await visualTaskSnap({ imageDataUri: dataUri });
      if (result.tasks && result.tasks.length > 0) {
        setExtractedTasks(result.tasks);
      } else {
        toast({
          title: 'No Tasks Found',
          description: 'The AI could not identify any tasks in the image.',
        });
      }
    } catch (err: any) {
      console.error('Error in Visual Task Snap:', err);
      toast({
        title: 'Error processing image',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
  });

  const handleClear = () => {
    setImage(null);
    setExtractedTasks([]);
  };
  
  const handleAddExtractedTasks = async () => {
    if (extractedTasks.length === 0) return;
    await handleAddTasks(extractedTasks.map(title => ({ title, scheduledDate: new Date().toISOString().split('T')[0] })));
    toast({
        title: 'Tasks Added!',
        description: `${extractedTasks.length} task(s) have been added to your list for today.`,
    });
    handleClear();
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Camera />
            Visual Task Snap
        </CardTitle>
        <CardDescription>Upload an image of handwritten notes to convert them into tasks.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center gap-4">
        {image ? (
            <div className="w-full text-center">
                <Image
                    src={image}
                    alt="Uploaded notes"
                    width={300}
                    height={200}
                    className="rounded-md object-contain mx-auto border"
                />
            </div>
        ) : (
            <div
            {...getRootProps()}
            className={`w-full h-48 border-2 border-dashed rounded-lg flex flex-col justify-center items-center text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50 hover:border-primary'
            }`}
            >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
                {isDragActive ? 'Drop the image here...' : "Drag 'n' drop an image, or click"}
            </p>
            </div>
        )}

        {loading && (
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Analyzing image...</span>
            </div>
        )}
        
        {extractedTasks.length > 0 && !loading && (
            <div className="w-full space-y-2">
                <p className="text-sm font-medium">Extracted Tasks:</p>
                <ul className="list-disc list-inside bg-muted/50 p-3 rounded-md text-sm">
                    {extractedTasks.map((task, index) => <li key={index}>{task}</li>)}
                </ul>
            </div>
        )}

        <div className="w-full flex justify-end gap-2 mt-auto">
            {image && (
                 <Button variant="ghost" onClick={handleClear} disabled={loading}>
                    <X className="mr-2" />
                    Clear
                 </Button>
            )}
            {extractedTasks.length > 0 && (
                 <Button onClick={handleAddExtractedTasks} disabled={loading}>
                     <CheckCircle className="mr-2" />
                     Add to Tasks
                 </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
