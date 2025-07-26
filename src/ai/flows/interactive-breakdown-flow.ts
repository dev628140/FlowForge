
'use server';

/**
 * @fileOverview A flow for interactively breaking down a task based on user instructions.
 *
 * - `interactiveBreakdown` - A function that generates a list of subtasks for a given task and a user prompt.
 * - `InteractiveBreakdownInput` - The input type for the function.
 * - `InteractiveBreakdownOutput` - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveBreakdownInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task to be broken down.'),
  taskDescription: z.string().optional().describe('The optional description of the task for more context.'),
  userPrompt: z.string().describe('The user\'s specific instructions on how to break down the task.'),
});
export type InteractiveBreakdownInput = z.infer<typeof InteractiveBreakdownInputSchema>;

const SubtaskSchema = z.object({
    title: z.string().describe('The title of the subtask.'),
    description: z.string().optional().describe('An optional brief description for the subtask.'),
});

const InteractiveBreakdownOutputSchema = z.object({
  subtasks: z.array(SubtaskSchema).describe('A list of actionable subtasks based on the user\'s instructions.'),
});
export type InteractiveBreakdownOutput = z.infer<typeof InteractiveBreakdownOutputSchema>;

export async function interactiveBreakdown(input: InteractiveBreakdownInput): Promise<InteractiveBreakdownOutput> {
  return interactiveBreakdownFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interactiveBreakdownPrompt',
  input: {schema: InteractiveBreakdownInputSchema},
  output: {schema: InteractiveBreakdownOutputSchema},
  prompt: `You are an expert project manager. Your job is to take a high-level task and break it down into a list of smaller, actionable subtasks.
  You MUST follow the user's instructions for how the breakdown should be performed.

Task to break down:
Title: {{{taskTitle}}}
{{#if taskDescription}}
Description: {{{taskDescription}}}
{{/if}}

User's breakdown instructions:
"{{{userPrompt}}}"

Generate the list of subtasks now. Do not repeat the main task title in the subtask list.
`,
});

const interactiveBreakdownFlow = ai.defineFlow(
  {
    name: 'interactiveBreakdownFlow',
    inputSchema: InteractiveBreakdownInputSchema,
    outputSchema: InteractiveBreakdownOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
