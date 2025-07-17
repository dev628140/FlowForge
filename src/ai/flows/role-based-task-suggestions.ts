// src/ai/flows/role-based-task-suggestions.ts
'use server';

/**
 * @fileOverview Provides AI-driven task suggestions tailored to a user's selected role.
 *
 * - `getRoleBasedTaskSuggestions` -  A function to generate task suggestions based on the user's specified role.
 * - `RoleBasedTaskSuggestionsInput` - The input type for the `getRoleBasedTaskSuggestions` function.
 * - `RoleBasedTaskSuggestionsOutput` - The output type for the `getRoleBasedTaskSuggestions` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RoleBasedTaskSuggestionsInputSchema = z.object({
  role: z
    .string()
    .describe("The user's role (e.g., 'Student', 'Developer', 'Founder')."),
  userTask: z
    .string()
    .describe("The task the user wants to accomplish (e.g., 'get fit this month')."),
});
export type RoleBasedTaskSuggestionsInput = z.infer<
  typeof RoleBasedTaskSuggestionsInputSchema
>;

const RoleBasedTaskSuggestionsOutputSchema = z.object({
  suggestedTasks: z
    .array(z.string())
    .describe('A list of suggested tasks tailored to the user role.'),
  timeboxingSuggestions: z
    .string()
    .describe(
      'Suggestions for timeboxing the tasks based on the user role and task.'
    ),
  motivationalNudges: z
    .string()
    .describe(
      'Motivational nudges tailored to the user role to encourage task completion.'
    ),
});
export type RoleBasedTaskSuggestionsOutput = z.infer<
  typeof RoleBasedTaskSuggestionsOutputSchema
>;

export async function getRoleBasedTaskSuggestions(
  input: RoleBasedTaskSuggestionsInput
): Promise<RoleBasedTaskSuggestionsOutput> {
  return roleBasedTaskSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'roleBasedTaskSuggestionsPrompt',
  input: {schema: RoleBasedTaskSuggestionsInputSchema},
  output: {schema: RoleBasedTaskSuggestionsOutputSchema},
  prompt: `You are an AI productivity assistant that provides task suggestions,
timeboxing advice, and motivational nudges tailored to a user's role.

Role: {{{role}}}
User Task: {{{userTask}}}

Provide a list of suggested tasks, timeboxing suggestions, and motivational nudges specific to the user's role to help them accomplish their task.`,
});

const roleBasedTaskSuggestionsFlow = ai.defineFlow(
  {
    name: 'roleBasedTaskSuggestionsFlow',
    inputSchema: RoleBasedTaskSuggestionsInputSchema,
    outputSchema: RoleBasedTaskSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
