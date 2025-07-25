
'use server';

/**
 * @fileOverview A new, robust AI assistant flow for directing actions.
 * This flow's primary job is to understand a user's command and create a
 * structured, executable plan. The plan is then returned to the UI for
 * user confirmation before any action is taken.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format, eachDayOfInterval, parseISO, addDays, startOfDay } from 'date-fns';
import { analyzeProductivityTool, breakdownTaskTool, generateLearningPlanTool, reflectOnProgressTool, summarizeTaskTool } from '../tools';


const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const FullTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    description: z.string().optional().nullable(),
    scheduledDate: z.string().optional().nullable(),
    scheduledTime: z.string().optional().nullable(),
    order: z.number().optional().nullable(),
    subtasks: z.array(z.object({
        id: z.string(),
        title: z.string(),
        completed: z.boolean(),
    })).optional().nullable(),
});

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  history: z.array(MessageSchema).describe("The full conversation history between the user and the assistant."),
  tasks: z.array(FullTaskSchema).describe("The user's current list of tasks, including their IDs, titles, descriptions, and completion status. This is the absolute source of truth for the current state."),
  role: z.string().describe("The user's self-selected role (e.g., 'Developer')."),
  date: z.string().describe("The current date in YYYY-MM-DD format."),
  timezone: z.string().describe("The user's current timezone (e.g., 'America/New_York')."),
  chatSessionId: z.string().optional().nullable().describe("The ID of the current chat session."),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;


// Define the structured output (the "plan") the AI should generate.
const TaskToAddSchema = z.object({
    title: z.string().describe('The title of the new task.'),
    description: z.string().optional().nullable().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().nullable().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().nullable().describe('The scheduled time for the task in HH:mm 24-hour format.'),
    timezone: z.string().optional().nullable().describe("The user's timezone, taken from the input."),
});

const TaskToUpdateSchema = z.object({
    taskId: z.string().describe("The unique ID of the task to update."),
    updates: z.object({
        title: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        completed: z.boolean().optional().nullable(),
        scheduledDate: z.string().optional().nullable(),
        scheduledTime: z.string().optional().nullable(),
        order: z.number().optional().nullable().describe("The new order for the task. This field is for internal use and should not typically be set by the assistant."),
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
  title: z.string().optional().nullable().describe("A short, concise title (4-5 words max) for this conversation. You should ONLY generate this on the very first turn of the conversation (when history has only one user message)."),
  response: z.string().describe("A concise, friendly summary of the plan you have generated, or a conversational response if you are asking for clarification or providing information. For example, 'I've added 3 tasks for you.' or 'I've scheduled that for you.' or 'Which task are you referring to?'. If no actions are taken, provide a helpful conversational response or the direct result from a tool (like a summary or analysis)."),
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
    prompt: `You are FlowForge, an expert AI productivity assistant. Your goal is to have a conversation with the user and help them with any request. You MUST generate a plan of actions (tasksToAdd, tasksToUpdate, tasksToDelete, subtasksToAdd) for any user request that implies a modification of their tasks. Do not just say you've done it, create the action plan.

    Current Date: {{{date}}}
    User's Timezone: {{{timezone}}}
    User's Role: {{{role}}}

    You have the user's current task list (including subtasks) and the conversation history for context. You MUST use the provided task list as the absolute source of truth for task IDs when a tool requires one or when updating/deleting a task. Do not mention the IDs in your conversational responses to the user.

    **COMMAND INTERPRETATION RULES:**
    1.  **Action is Required:** If the user asks to add, create, schedule, update, modify, complete, or delete a task, you MUST populate the corresponding action arrays in your output (tasksToAdd, tasksToUpdate, tasksToDelete).
    2.  **Recurring Tasks / Date Ranges:** If a user says "every day until a date" or "for the next X days", you MUST create a separate task entry in \`tasksToAdd\` for each individual day in that range. For example, "add 'Go for a run' every day until October 27th" should result in multiple task objects, one for each day. If they say "add X three times a day", you must create three separate tasks for that title for each day in the range. The \`eachDayOfInterval\` function can help with this. Today's date is {{{date}}}.
    3.  **Ambiguity:** If a command is ambiguous (e.g., "delete the marketing task" when there are multiple), you MUST ask for clarification in your response and NOT generate a plan.
    4.  **No Action Needed:** For general conversation, questions, or requests that are best handled by a tool, provide a helpful response in the 'response' field. DO NOT generate an empty action plan.
    5.  **Tool Usage:** If a request is to "summarize", "analyze", "break down", "reflect", or "create a learning plan", you MUST use the appropriate tool. Provide the tool's output directly in your 'response' field.
    6.  **Conversation Title:** If this is the first turn of the conversation (history has one user message), you MUST generate a short, concise title (4-5 words max) for the conversation. On all subsequent turns, leave the title field empty.
    7.  **Timezone:** When adding a task with a date, you MUST include the user's timezone from the input in the task object.

    **USER'S TASK LIST (for context, IDs are for your internal use ONLY):**
    {{#if tasks}}
      {{#each tasks}}
      - ID: {{this.id}}, Title: "{{this.title}}", Completed: {{this.completed}}{{#if this.scheduledDate}}, Scheduled: {{this.scheduledDate}}{{#if this.scheduledTime}} at {{this.scheduledTime}}{{/if}}{{/if}}{{#if this.subtasks}}, Subtasks: {{this.subtasks.length}}{{/if}}
        {{#if this.subtasks}}
            {{#each this.subtasks}}
            - Subtask ID: {{this.id}}, Title: "{{this.title}}", Completed: {{this.completed}}
            {{/each}}
        {{/if}}
      {{/each}}
    {{else}}
      The user has no tasks.
    {{/if}}

    Now, analyze the last message in the conversation history and generate your response and/or plan.
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**: {{this.content}}
    {{/each}}
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
