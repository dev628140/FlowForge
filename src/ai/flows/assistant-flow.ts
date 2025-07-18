'use server';

/**
 * @fileOverview A new, robust AI assistant flow for directing actions.
 * This flow's primary job is to understand a user's command and create a
 * structured, executable plan. The plan is then returned to the UI for
 * user confirmation before any action is taken.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Task, UserRole } from '@/lib/types';


// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  prompt: z.string().describe("The user's command or request."),
  tasks: z.array(z.any()).describe("The user's current list of tasks, including their IDs, titles, descriptions, and completion status."),
  role: z.string().describe("The user's self-selected role (e.g., 'Developer')."),
  date: z.string().describe("The current date in YYYY-MM-DD format."),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;


// Define the structured output (the "plan") the AI should generate.
const TaskToAddSchema = z.object({
    title: z.string().describe('The title of the new task.'),
    description: z.string().optional().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().describe('The scheduled time for the task in HH:mm 24-hour format.'),
});

const TaskToUpdateSchema = z.object({
    taskId: z.string().describe("The unique ID of the task to update."),
    updates: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        scheduledDate: z.string().optional(),
        scheduledTime: z.string().optional(),
    }).describe("The fields of the task to update."),
});

const TaskToDeleteSchema = z.object({
    taskId: z.string().describe("The unique ID of the task to delete."),
});

const AssistantOutputSchema = z.object({
  response: z.string().describe("A concise, friendly summary of the plan you have generated. For example, 'I can add 2 tasks and delete 1.' or 'I've scheduled that for you.' If no actions are taken, provide a helpful conversational response."),
  tasksToAdd: z.array(TaskToAddSchema).optional().describe("A list of new tasks to be added based on the user's command."),
  tasksToUpdate: z.array(TaskToUpdateSchema).optional().describe("A list of existing tasks to be updated."),
  tasksToDelete: z.array(TaskToDeleteSchema).optional().describe("A list of existing tasks to be deleted."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;


// The main exported function that the UI will call
export async function runAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}


// Define the AI prompt. This is where we instruct the AI on how to behave.
const assistantPrompt = ai.definePrompt({
    name: 'assistantPrompt',
    input: { schema: AssistantInputSchema },
    output: { schema: AssistantOutputSchema },
    prompt: `You are FlowForge, an expert AI task management assistant. Your goal is to understand a user's command and create a structured plan of action which will be reviewed and confirmed by the user.

    Current Date: {{{date}}}
    User's Role: {{{role}}}

    You have the user's current task list for context. You MUST use the provided task IDs when generating a plan to update or delete tasks.
    Based on the user's prompt, generate a plan. If the user's request is unclear, ask for clarification in your response and do not generate any tasks.
    If the command is conversational (e.g., "hello", "thank you"), just provide a friendly text response and do not generate any tasks.

    User's Command: "{{{prompt}}}"

    User's Task List (for context):
    {{#if tasks}}
      {{#each tasks}}
      - ID: {{this.id}}, Title: "{{this.title}}", Completed: {{this.completed}}{{#if this.scheduledDate}}, Scheduled: {{this.scheduledDate}}{{/if}}
      {{/each}}
    {{else}}
      The user has no tasks.
    {{/if}}

    Now, generate the plan based on the user's command. Your response should summarize the plan.
    `,
});

// Define the Genkit flow
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    const { output } = await assistantPrompt(input);
    if (!output) {
      // This case handles content filtering or other generation errors.
      throw new Error("The AI was unable to generate a response. This may be due to content safety filters. Please try rephrasing your request.");
    }
    return output;
  }
);
