// src/ai/flows/auto-schedule-flow.ts
'use server';

/**
 * @fileOverview An AI flow for automatically scheduling tasks for the week.
 *
 * - `autoSchedule` - A function that generates a suggested schedule for a list of tasks.
 * - `AutoScheduleInput` - The input type for the `autoSchedule` function.
 * - `AutoScheduleOutput` - The output type for the `autoSchedule` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

const AutoScheduleInputSchema = z.object({
  tasks: z.array(TaskInputSchema).describe('The list of tasks to be scheduled.'),
  startDate: z.string().describe('The start date for the week in ISO 8601 format (e.g., YYYY-MM-DD).'),
});
export type AutoScheduleInput = z.infer<typeof AutoScheduleInputSchema>;

const ScheduledTaskSchema = z.object({
  taskId: z.string().describe('The ID of the task being scheduled.'),
  date: z.string().describe('The suggested date for the task in ISO 8601 format (e.g., YYYY-MM-DD).'),
});

const AutoScheduleOutputSchema = z.object({
  schedule: z.array(ScheduledTaskSchema).describe('The list of tasks with their suggested dates.'),
});
export type AutoScheduleOutput = z.infer<typeof AutoScheduleOutputSchema>;

export async function autoSchedule(input: AutoScheduleInput): Promise<AutoScheduleOutput> {
  return autoScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoSchedulePrompt',
  input: {schema: AutoScheduleInputSchema},
  output: {schema: AutoScheduleOutputSchema},
  prompt: `You are a master scheduler. Your job is to take a list of tasks and schedule them over the next 7 days, starting from the given start date.

Distribute the tasks evenly throughout the week. Do not assign more than 3 tasks to any single day.
Return a list of scheduled tasks with their assigned dates.

Start Date: {{{startDate}}}

Tasks to schedule:
{{#each tasks}}
- ID: {{this.id}}, Title: {{this.title}}{{#if this.description}}, Description: {{this.description}}{{/if}}
{{/each}}
`,
});

const autoScheduleFlow = ai.defineFlow(
  {
    name: 'autoScheduleFlow',
    inputSchema: AutoScheduleInputSchema,
    outputSchema: AutoScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
