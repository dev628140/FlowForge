'use server';

/**
 * @fileOverview Task summarization flow using Genkit.
 *
 * - summarizeTask - A function that summarizes a given task description.
 * - SummarizeTaskInput - The input type for the summarizeTask function.
 * - SummarizeTaskOutput - The return type for the summarizeTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTaskInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task to summarize.'),
  taskDescription: z.string().optional().describe('The optional description of the task to summarize.'),
});
export type SummarizeTaskInput = z.infer<typeof SummarizeTaskInputSchema>;

const SummarizeTaskOutputSchema = z.object({
  summary: z.string().describe('A summary of the key talking points and action items of the task.'),
});
export type SummarizeTaskOutput = z.infer<typeof SummarizeTaskOutputSchema>;

export async function summarizeTask(input: SummarizeTaskInput): Promise<SummarizeTaskOutput> {
  return summarizeTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTaskPrompt',
  input: {schema: SummarizeTaskInputSchema},
  output: {schema: SummarizeTaskOutputSchema},
  prompt: `Summarize the following task, focusing on key talking points and action items. The main goal is defined by the title. Use the description for additional context if it is provided.

Task Title: {{{taskTitle}}}
{{#if taskDescription}}
Task Description:
{{{taskDescription}}}
{{/if}}
`,
});

const summarizeTaskFlow = ai.defineFlow(
  {
    name: 'summarizeTaskFlow',
    inputSchema: SummarizeTaskInputSchema,
    outputSchema: SummarizeTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
