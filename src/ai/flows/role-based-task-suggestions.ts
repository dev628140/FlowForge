// src/ai/flows/role-based-task-suggestions.ts
'use server';

/**
 * @fileOverview Provides AI-driven task suggestions tailored to a user's selected role and mood.
 *
 * - `getRoleBasedTaskSuggestions` -  A function to generate task suggestions based on the user's specified role and mood.
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
  mood: z
    .string()
    .describe("The user's current mood (e.g., 'High Energy', 'Stressed')."),
});
export type RoleBasedTaskSuggestionsInput = z.infer<
  typeof RoleBasedTaskSuggestionsInputSchema
>;

const RoleBasedTaskSuggestionsOutputSchema = z.object({
  suggestedTasks: z
    .array(z.string())
    .describe('A list of suggested tasks tailored to the user role and mood.'),
  timeboxingSuggestions: z
    .string()
    .describe(
      'Suggestions for timeboxing the tasks based on the user role, task, and mood.'
    ),
  motivationalNudges: z
    .string()
    .describe(
      'Motivational nudges tailored to the user role and mood to encourage task completion.'
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
timeboxing advice, and motivational nudges tailored to a user's role and mood.

Role: {{{role}}}
Mood: {{{mood}}}
User Task: {{{userTask}}}

Provide a list of suggested tasks, timeboxing suggestions, and motivational nudges specific to the user's role and current mood to help them accomplish their task. For example, if the mood is 'Low Energy', suggest smaller, easier tasks.`,
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
