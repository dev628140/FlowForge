'use server';

/**
 * @fileOverview A flow for breaking down a larger task into smaller subtasks.
 *
 * - `breakdownTask` - A function that generates a list of subtasks for a given task.
 * - `BreakdownTaskInput` - The input type for the breakdownTask function.
 * - `BreakdownTaskOutput` - The return type for the breakdownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakdownTaskInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task to be broken down.'),
});
export type BreakdownTaskInput = z.infer<typeof BreakdownTaskInputSchema>;

const BreakdownTaskOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('A list of actionable subtasks.'),
});
export type BreakdownTaskOutput = z.infer<typeof BreakdownTaskOutputSchema>;

export async function breakdownTask(input: BreakdownTaskInput): Promise<BreakdownTaskOutput> {
  return breakdownTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'breakdownTaskPrompt',
  input: {schema: BreakdownTaskInputSchema},
  output: {schema: BreakdownTaskOutputSchema},
  prompt: `You are a project manager. Your job is to take a high-level task and break it down into a list of smaller, actionable subtasks.
  Do not repeat the main task in the subtask list. The subtasks should be concise and clear steps to accomplish the main task.

Task to break down: {{{taskTitle}}}
`,
});

const breakdownTaskFlow = ai.defineFlow(
  {
    name: 'breakdownTaskFlow',
    inputSchema: BreakdownTaskInputSchema,
    outputSchema: BreakdownTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
