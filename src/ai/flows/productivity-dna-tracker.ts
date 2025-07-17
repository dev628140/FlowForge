// src/ai/flows/productivity-dna-tracker.ts
'use server';

/**
 * @fileOverview Analyzes user's completed tasks to identify productivity patterns.
 *
 * - `analyzeProductivity` - A function to generate a productivity report.
 * - `ProductivityAnalysisInput` - The input type for the `analyzeProductivity` function.
 * - `ProductivityAnalysisOutput` - The output type for the `analyzeProductivity` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInfoSchema = z.object({
  title: z.string(),
  completedAt: z.string().describe('The ISO 8601 timestamp when the task was completed.'),
});

const ProductivityAnalysisInputSchema = z.object({
  tasks: z.array(TaskInfoSchema).describe('A list of completed tasks with their completion timestamps.'),
});
export type ProductivityAnalysisInput = z.infer<typeof ProductivityAnalysisInputSchema>;

const ProductivityAnalysisOutputSchema = z.object({
  report: z
    .string()
    .describe('A markdown-formatted report summarizing the user\'s productivity patterns, including peak times and days.'),
});
export type ProductivityAnalysisOutput = z.infer<typeof ProductivityAnalysisOutputSchema>;

export async function analyzeProductivity(
  input: ProductivityAnalysisInput
): Promise<ProductivityAnalysisOutput> {
  return productivityDnaTrackerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productivityDnaTrackerPrompt',
  input: {schema: ProductivityAnalysisInputSchema},
  output: {schema: ProductivityAnalysisOutputSchema},
  prompt: `You are a productivity expert. Analyze the following list of completed tasks to identify patterns in the user's productivity.
Determine the user's most productive day of the week and the peak hours for their productivity.

Your response should be a friendly, insightful summary written in markdown. Highlight the key findings clearly.

Tasks Completed:
{{#each tasks}}
- "{{this.title}}" completed at {{this.completedAt}}
{{/each}}

Generate a productivity report based on this data.`,
});

const productivityDnaTrackerFlow = ai.defineFlow(
  {
    name: 'productivityDnaTrackerFlow',
    inputSchema: ProductivityAnalysisInputSchema,
    outputSchema: ProductivityAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
