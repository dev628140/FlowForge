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
    .describe("The user's current mood (e.g., 'High Energy', 'Stressed', 'Overwhelmed')."),
});
export type RoleBasedTaskSuggestionsInput = z.infer<
  typeof RoleBasedTaskSuggestionsInputSchema
>;

const RoleBasedTaskSuggestionsOutputSchema = z.object({
  suggestedTasks: z
    .array(z.string())
    .describe('A list of suggested tasks tailored to the user role and mood. If the user feels overwhelmed or stressed, these should be small, easy-to-win steps.'),
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
  prompt: `You are an empathetic AI productivity assistant. Your goal is to provide task suggestions, timeboxing advice, and motivational nudges tailored to a user's role and mood.

Role: {{{role}}}
Mood: {{{mood}}}
User Task: {{{userTask}}}

Your suggestions must be adapted to the user's mood.
- If the mood is 'Overwhelmed', 'Stressed', or 'Low Energy', suggest very small, simple, "2-minute win" tasks to get them started (e.g., 'Drink a glass of water', 'Clear your desk', 'Reply to one email'). The goal is to build momentum, not tackle the main task directly yet. Ask if they want to break down the main task into easier steps.
- If the mood is 'High Energy' or 'Motivated', suggest more challenging or creative sub-tasks that help them make significant progress on their main goal.

Provide a list of suggested tasks, timeboxing suggestions, and motivational nudges specific to the user's role and current mood to help them accomplish their task.`,
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
