
'use server';

/**
 * @fileOverview Provides dynamic, personalized suggestions based on user's task history.
 *
 * - `getDynamicSuggestions` - A function to generate "next best action" suggestions.
 * - `DynamicSuggestionsInput` - The input type for the `getDynamicSuggestions` function.
 * - `DynamicSuggestionsOutput` - The output type for the `getDynamicSuggestions` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSchema = z.object({
  title: z.string(),
  completed: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
});

const DynamicSuggestionsInputSchema = z.object({
  tasks: z.array(TaskSchema).describe("The user's list of tasks for today."),
  role: z.string().describe("The user's current role (e.g., 'Developer', 'Student')."),
});
export type DynamicSuggestionsInput = z.infer<typeof DynamicSuggestionsInputSchema>;


const DynamicSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 2-3 concise, actionable suggestions for the user based on their tasks for the day.'),
});
export type DynamicSuggestionsOutput = z.infer<typeof DynamicSuggestionsOutputSchema>;


export async function getDynamicSuggestions(
  input: DynamicSuggestionsInput
): Promise<DynamicSuggestionsOutput> {
  return dynamicSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dynamicSuggestionsPrompt',
  input: {schema: DynamicSuggestionsInputSchema},
  output: {schema: DynamicSuggestionsOutputSchema},
  prompt: `You are a proactive AI productivity assistant. Your goal is to provide a "Next Best Action" feed for the user.
Analyze the user's task list for today to identify patterns, opportunities, or potential blockers.
Based on their role and today's tasks, generate 2-3 concise and highly relevant suggestions.

- Infer task categories (e.g., 'health', 'work', 'learning', 'deep work') from the task titles.
- If they seem to be procrastinating on a big task, suggest breaking it down or starting a focus session.
- If there are related tasks, suggest batching them together.
- Keep the suggestions friendly, encouraging, and actionable.

User's Role: {{{role}}}

Today's Tasks:
{{#each tasks}}
- {{this.title}} (Completed: {{this.completed}})
{{/each}}

Generate your suggestions now.
`,
});

const dynamicSuggestionsFlow = ai.defineFlow(
  {
    name: 'dynamicSuggestionsFlow',
    inputSchema: DynamicSuggestionsInputSchema,
    outputSchema: DynamicSuggestionsOutputSchema,
  },
  async input => {
    // If there are no tasks, return empty suggestions to avoid hallucination
    if (input.tasks.length === 0) {
      return { suggestions: ["Add some tasks for today to get personalized suggestions!"] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
