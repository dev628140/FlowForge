
// src/ai/flows/natural-language-task-planning.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for natural language task planning.
 *
 * It allows users to input a goal in natural language and have the app automatically
 * break it down into a list of actionable daily tasks using an LLM. It can also handle
 * scheduling tasks over a specified period.
 *
 * @interface NaturalLanguageTaskPlanningInput - Defines the input schema for the flow.
 * @interface NaturalLanguageTaskPlanningOutput - Defines the output schema for the flow.
 * @function naturalLanguageTaskPlanning - The main function to trigger the task planning flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, addDays } from 'date-fns';
import { NaturalLanguageTaskPlanningInputSchema, NaturalLanguageTaskPlanningOutput, NaturalLanguageTaskPlanningInput } from '@/lib/types/conversational-agent';

export async function naturalLanguageTaskPlanning(input: NaturalLanguageTaskPlanningInput): Promise<NaturalLanguageTaskPlanningOutput> {
  return naturalLanguageTaskPlanningFlow(input);
}

const naturalLanguageTaskPlanningPrompt = ai.definePrompt({
  name: 'naturalLanguageTaskPlanningPrompt',
  input: {schema: NaturalLanguageTaskPlanningInputSchema},
  output: {schema: NaturalLanguageTaskPlanningOutput},
  prompt: `You are a personal assistant. Your job is to take a high-level goal and break it down into a list of actionable tasks.

If the user provides a timeframe (e.g., "for the next 45 days", "this week"), distribute the tasks evenly across that period.
Today's date is ${format(new Date(), 'yyyy-MM-dd')}.
When scheduling, provide a 'scheduledDate' for each task in 'YYYY-MM-DD' format.
If a time is mentioned, provide a 'scheduledTime' in 'HH:mm' 24-hour format.
If the user provides a list of tasks to be scheduled, create separate tasks for each item in the list.

Goal: {{{goal}}}

Generate the tasks.`,
});

const naturalLanguageTaskPlanningFlow = ai.defineFlow(
  {
    name: 'naturalLanguageTaskPlanningFlow',
    inputSchema: NaturalLanguageTaskPlanningInputSchema,
    outputSchema: NaturalLanguageTaskPlanningOutput,
  },
  async input => {
    const {output} = await naturalLanguageTaskPlanningPrompt(input);
    return output!;
  }
);
