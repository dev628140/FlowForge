// src/ai/flows/learning-plan-flow.ts
'use server';

/**
 * @fileOverview An AI flow for generating a structured learning plan for a given topic.
 *
 * - `generateLearningPlan` - A function that creates a learning plan.
 * - `LearningPlanInput` - The input type for the `generateLearningPlan` function.
 * - `LearningPlanOutput` - The output type for the `generateLearningPlan` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LearningPlanInputSchema = z.object({
  topic: z.string().describe('The topic the user wants to learn.'),
});
export type LearningPlanInput = z.infer<typeof LearningPlanInputSchema>;

const LearningStepSchema = z.object({
    step: z.number(),
    title: z.string().describe('The title of the learning step.'),
    description: z.string().describe('A brief description of what to do in this step.'),
    estimated_time: z.string().describe('An estimation of how long this step will take (e.g., "2 hours", "30 minutes").'),
});

const LearningPlanOutputSchema = z.object({
  learning_plan: z.array(LearningStepSchema).describe('A list of structured steps to learn the topic.'),
  resources: z.array(z.string()).describe('A list of suggested resources like articles, videos, or tutorials.'),
});
export type LearningPlanOutput = z.infer<typeof LearningPlanOutputSchema>;

export async function generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput> {
  return learningPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'learningPlanPrompt',
  input: {schema: LearningPlanInputSchema},
  output: {schema: LearningPlanOutputSchema},
  prompt: `You are an expert curriculum developer. A user wants to learn about a specific topic.
Create a structured, step-by-step learning plan for them. Include a list of helpful resources.

Topic to learn: {{{topic}}}

Generate a learning plan and a list of resources.`,
});

const learningPlanFlow = ai.defineFlow(
  {
    name: 'learningPlanFlow',
    inputSchema: LearningPlanInputSchema,
    outputSchema: LearningPlanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
