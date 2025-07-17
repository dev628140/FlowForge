'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckCircle, Zap } from 'lucide-react';

const integrations = [
  { name: 'Google Calendar', description: 'Sync your tasks and deadlines.', logo: 'google-calendar.svg', dataAiHint: 'logo calendar' },
  { name: 'Notion', description: 'Connect your notes and databases.', logo: 'notion.svg', dataAiHint: 'logo notion' },
  { name: 'GitHub', description: 'Track issues and pull requests.', logo: 'github.svg', dataAiHint: 'logo github' },
  { name: 'Slack', description: 'Get notifications and create tasks.', logo: 'slack.svg', dataAiHint: 'logo slack' },
  { name: 'Gmail', description: 'Turn emails into tasks automatically.', logo: 'gmail.svg', dataAiHint: 'logo email' },
  { name: 'Telegram', description: 'Create tasks from messages.', logo: 'telegram.svg', dataAiHint: 'logo telegram' },
];

const LOCAL_STORAGE_KEY = 'connectedIntegrations';

export default function IntegrationsPage() {
  const [connected, setConnected] = React.useState<Set<string>>(new Set());
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
    try {
      const storedConnections = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedConnections) {
        setConnected(new Set(JSON.parse(storedConnections)));
      }
    } catch (error) {
      console.error('Failed to parse connections from localStorage', error);
    }
  }, []);

  const handleToggleConnection = (name: string) => {
    const newConnected = new Set(connected);
    let isConnecting = false;

    if (newConnected.has(name)) {
      newConnected.delete(name);
    } else {
      newConnected.add(name);
      isConnecting = true;
    }

    setConnected(newConnected);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(newConnected)));

    toast({
      title: isConnecting ? `Connected to ${name}` : `Disconnected from ${name}`,
      description: isConnecting
        ? 'You can now sync your data.'
        : 'Your data will no longer be synced.',
    });
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold font-headline mb-2">Smart Integrations</h1>
      <p className="text-muted-foreground mb-6">Connect FlowForge to your favorite apps to centralize your workflow.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(integration => {
          const isConnected = isClient && connected.has(integration.name);
          return (
            <Card key={integration.name} className={cn('transition-all', isConnected && 'border-primary/50 shadow-lg')}>
              <CardHeader className="flex flex-row items-center gap-4">
                 <Image 
                  src={`https://placehold.co/40x40.png`} 
                  alt={`${integration.name} logo`} 
                  width={40} 
                  height={40}
                  className={cn(isConnected && 'grayscale-0', !isConnected && 'grayscale')}
                  data-ai-hint={integration.dataAiHint}
                />
                <div>
                  <CardTitle>{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={isConnected ? 'secondary' : 'default'}
                  onClick={() => handleToggleConnection(integration.name)}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle className="mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
