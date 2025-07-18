
'use server';

/**
 * @fileOverview A new, robust AI assistant flow for directing actions.
 * This flow's primary job is to understand a user's command and create a
 * structured, executable plan. The plan is then returned to the UI for
 * user confirmation before any action is taken.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
    breakdownTaskTool,
    generateLearningPlanTool,
    summarizeTaskTool,
    analyzeProductivityTool,
    reflectOnProgressTool,
} from '@/ai/tools';
import { format } from 'date-fns';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  history: z.array(MessageSchema).describe("The full conversation history between the user and the assistant."),
  tasks: z.array(z.any()).describe("The user's current list of tasks, including their IDs, titles, descriptions, and completion status."),
  role: z.string().describe("The user's self-selected role (e.g., 'Developer')."),
  date: z.string().describe("The current date in YYYY-MM-DD format."),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;


// Define the structured output (the "plan") the AI should generate.
const TaskToAddSchema = z.object({
    title: z.string().describe('The title of the new task.'),
    description: z.string().optional().nullable().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().nullable().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().nullable().describe('The scheduled time for the task in HH:mm 24-hour format.'),
});

const TaskToUpdateSchema = z.object({
    taskId: z.string().describe("The unique ID of the task to update."),
    updates: z.object({
        title: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        completed: z.boolean().optional().nullable(),
        scheduledDate: z.string().optional().nullable(),
        scheduledTime: z.string().optional().nullable(),
    }).describe("The fields of the task to update."),
});

const TaskToDeleteSchema = z.object({
    taskId: z.string().describe("The unique ID of the task to delete."),
});

const SubtasksToAddSchema = z.object({
    parentId: z.string().describe("The ID of the parent task to which these subtasks will be added."),
    subtasks: z.array(z.object({
        title: z.string().describe("The title of the subtask.")
    })).describe("A list of subtasks to add.")
});


const AssistantOutputSchema = z.object({
  response: z.string().describe("A concise, friendly summary of the plan you have generated, or a conversational response if you are asking for clarification or providing information. For example, 'I can add 2 tasks and delete 1.' or 'I've scheduled that for you.' or 'Which task are you referring to?'. If no actions are taken, provide a helpful conversational response or the direct result from a tool (like a summary or analysis)."),
  tasksToAdd: z.array(TaskToAddSchema).optional().nullable().describe("A list of new tasks to be added based on the user's command."),
  tasksToUpdate: z.array(TaskToUpdateSchema).optional().nullable().describe("A list of existing tasks to be updated."),
  tasksToDelete: z.array(TaskToDeleteSchema).optional().nullable().describe("A list of existing tasks to be deleted."),
  subtasksToAdd: z.array(SubtasksToAddSchema).optional().nullable().describe("A list of subtasks to add to existing parent tasks.")
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
    tools: [
        breakdownTaskTool,
        generateLearningPlanTool,
        summarizeTaskTool,
        analyzeProductivityTool,
        reflectOnProgressTool,
    ],
    prompt: `You are FlowForge, an expert AI task management assistant. Your goal is to have a conversation with the user to understand their needs. Based on the conversation, you will eventually create a structured plan of action which will be reviewed and confirmed by the user. You can also answer questions and provide analysis using your available tools.

    Current Date: {{{date}}}
    User's Role: {{{role}}}

    You have the user's current task list and the conversation history for context. You MUST use the provided task IDs when a tool requires one.
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**: {{this.content}}
    {{/each}}
    
    Based on the latest user message and the entire conversation, determine the next step.
    - If you have enough information to create a plan, generate the plan and a summary response.
    - If the user's request is unclear or you need more information, ask a clarifying question in your response and do not generate any actions.
    - If the command is conversational (e.g., "hello", "thank you"), just provide a friendly text response and do not generate any actions.

    User's Task List (for context):
    {{#if tasks}}
      {{#each tasks}}
      - ID: {{this.id}}, Title: "{{this.title}}", Completed: {{this.completed}}{{#if this.scheduledDate}}, Scheduled: {{this.scheduledDate}}{{/if}}
      {{/each}}
    {{else}}
      The user has no tasks.
    {{/if}}

    Now, generate your response and/or plan based on the last message in the conversation history.
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
