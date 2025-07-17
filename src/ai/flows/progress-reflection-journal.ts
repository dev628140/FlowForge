'use server';

/**
 * @fileOverview A flow for generating progress reflection prompts and end-of-day summaries to motivate users.
 *
 * - progressReflectionJournal - A function that generates an end-of-day summary.
 * - ProgressReflectionJournalInput - The input type for the progressReflectionJournal function.
 * - ProgressReflectionJournalOutput - The return type for the progressReflectionJournal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProgressReflectionJournalInputSchema = z.object({
  tasksCompleted: z.array(
    z.string().describe('A list of tasks completed by the user during the day.')
  ).describe('The list of tasks completed by the user.'),
});
export type ProgressReflectionJournalInput = z.infer<typeof ProgressReflectionJournalInputSchema>;

const ProgressReflectionJournalOutputSchema = z.object({
  summary: z.string().describe('A motivational summary of the tasks completed by the user.'),
});
export type ProgressReflectionJournalOutput = z.infer<typeof ProgressReflectionJournalOutputSchema>;

export async function progressReflectionJournal(
  input: ProgressReflectionJournalInput
): Promise<ProgressReflectionJournalOutput> {
  return progressReflectionJournalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'progressReflectionJournalPrompt',
  input: {schema: ProgressReflectionJournalInputSchema},
  output: {schema: ProgressReflectionJournalOutputSchema},
  prompt: `You are an AI assistant designed to provide motivational end-of-day summaries based on the tasks a user has completed.

  Tasks Completed:
  {{#each tasksCompleted}}
  - {{{this}}}
  {{/each}}

  Generate a short, motivational summary of the user's accomplishments today to encourage continued productivity. Focus on highlighting their momentum and encouraging them to maintain it.`,
});

const progressReflectionJournalFlow = ai.defineFlow(
  {
    name: 'progressReflectionJournalFlow',
    inputSchema: ProgressReflectionJournalInputSchema,
    outputSchema: ProgressReflectionJournalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
