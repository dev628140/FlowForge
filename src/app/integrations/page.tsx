import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const integrations = [
  { name: 'Google Calendar', description: 'Sync your tasks and deadlines.', logo: 'google-calendar.svg', dataAiHint: 'logo calendar' },
  { name: 'Notion', description: 'Connect your notes and databases.', logo: 'notion.svg', dataAiHint: 'logo notion' },
  { name: 'GitHub', description: 'Track issues and pull requests.', logo: 'github.svg', dataAiHint: 'logo github' },
  { name: 'Slack', description: 'Get notifications and create tasks.', logo: 'slack.svg', dataAiHint: 'logo slack' },
  { name: 'Gmail', description: 'Turn emails into tasks automatically.', logo: 'gmail.svg', dataAiHint: 'logo email' },
  { name: 'Telegram', description: 'Create tasks from messages.', logo: 'telegram.svg', dataAiHint: 'logo telegram' },
];

export default function IntegrationsPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold font-headline mb-2">Smart Integrations</h1>
      <p className="text-muted-foreground mb-6">Connect FlowForge to your favorite apps to centralize your workflow.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(integration => (
          <Card key={integration.name}>
            <CardHeader className="flex flex-row items-center gap-4">
               <Image 
                src={`https://placehold.co/40x40.png`} 
                alt={`${integration.name} logo`} 
                width={40} 
                height={40}
                data-ai-hint={integration.dataAiHint}
              />
              <div>
                <CardTitle>{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Connect</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
