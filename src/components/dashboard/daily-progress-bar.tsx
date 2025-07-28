
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DailyProgressBarProps {
  tasks: Task[];
}

export default function DailyProgressBar({ tasks }: DailyProgressBarProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
      setProgress(0);
      return;
    }
    const completedTasks = tasks.filter(task => task.completed).length;
    const newProgress = (completedTasks / totalTasks) * 100;
    setProgress(newProgress);
  }, [tasks]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Daily Progress</CardTitle>
        <CardDescription>{`You've completed ${tasks.filter(t => t.completed).length} of ${tasks.length} tasks today.`}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
            <Progress value={progress} className="w-full" />
            <span className="text-sm font-semibold text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
