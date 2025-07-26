'use server';

/**
 * @fileOverview A new, robust AI agent flow for directing actions.
 * This flow's primary job is to understand a user's command, use tools if necessary,
 * and create a structured, executable plan for task management.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import {
  breakdownTaskTool,
  generateLearningPlanTool,
  summarizeTaskTool,
  analyzeProductivityTool,
  reflectOnProgressTool,
} from '../tools';


// The web search tool, defined here to be used by the agent.
const webSearchTool = ai.defineTool(
    {
      name: 'webSearch',
      description: 'Searches the web for information on a given topic. Use this for general knowledge questions, recommendations, or finding current information.',
      inputSchema: z.object({
        query: z.string().describe('The search query.'),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
        // This leverages a pre-built tool from the Google AI plugin
        return await googleAI.googleSearchTool()({input: input.query});
    }
);


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

// Define the input schema for the agent
const AgentInputSchema = z.object({
  history: z.array(MessageSchema).describe("The full conversation history between the user and the agent."),
  tasks: z.array(FullTaskSchema).describe("The user's current list of tasks, including their IDs, titles, descriptions, and completion status. This is the absolute source of truth for the current state."),
  role: z.string().describe("The user's self-selected role (e.g., 'Developer')."),
  date: z.string().describe("The current date in YYYY-MM-DD format."),
  timezone: z.string().describe("The user's current timezone (e.g., 'America/New_York')."),
  chatSessionId: z.string().optional().nullable().describe("The ID of the current chat session."),
});
export type AgentInput = z.infer<typeof AgentInputSchema>;


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
        order: z.number().optional().nullable().describe("The new order for the task."),
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


const AgentOutputSchema = z.object({
  title: z.string().optional().nullable().describe("A short, concise title (4-5 words max) for this conversation. You should ONLY generate this on the very first turn of the conversation (when history has only one user message)."),
  response: z.string().describe("A concise, friendly summary of the plan you have generated, or a conversational response if you are asking for clarification or providing information. For example, 'I've added 3 tasks for you.' or 'I've scheduled that for you.' or 'Which task are you referring to?'. If no actions are taken, provide a helpful conversational response or the direct result from a tool (like a summary, analysis, or web search result)."),
  tasksToAdd: z.array(TaskToAddSchema).optional().nullable().describe("A list of new tasks to be added based on the user's command."),
  tasksToUpdate: z.array(TaskToUpdateSchema).optional().nullable().describe("A list of existing tasks to be updated."),
  tasksToDelete: z.array(TaskToDeleteSchema).optional().nullable().describe("A list of existing tasks to be deleted."),
  subtasksToAdd: z.array(SubtasksToAddSchema).optional().nullable().describe("A list of subtasks to add to existing parent tasks.")
});
export type AgentOutput = z.infer<typeof AgentOutputSchema>;


// The main exported function that the UI will call
export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  return agentFlow(input);
}

// Define the AI prompt. This is where we instruct the AI on how to behave.
const agentPrompt = ai.definePrompt({
    name: 'agentPrompt',
    input: { schema: AgentInputSchema },
    output: { schema: AgentOutputSchema },
    tools: [
        webSearchTool,
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
    1.  **General Knowledge & Recommendations:** If the user asks a question that requires external information (e.g., "what are the best thriller movies?", "who won the world cup?"), you MUST use the \`webSearchTool\`.
    2.  **Action is Required:** If the user asks to add, create, schedule, update, modify, complete, or delete a task, you MUST populate the corresponding action arrays in your output (tasksToAdd, tasksToUpdate, tasksToDelete).
    3.  **Recurring Tasks / Date Ranges:** If a user says "every day until a date" or "for the next X days", you MUST create a separate task entry in \`tasksToAdd\` for each individual day in that range.
    4.  **Ambiguity:** If a command is ambiguous (e.g., "delete the marketing task" when there are multiple), you MUST ask for clarification in your response and NOT generate a plan.
    5.  **No Action Needed:** For general conversation, questions, or requests that are best handled by a tool, provide a helpful response in the 'response' field. DO NOT generate an empty action plan. If a tool returns information (like a web search or summary), provide that information in your response.
    6.  **Task-Specific Tools:** If a request is to "summarize", "analyze", "break down", "reflect", or "create a learning plan" for a TASK, you MUST use the appropriate tool.
    7.  **Conversation Title:** If this is the first turn of the conversation (history has one user message), you MUST generate a short, concise title (4-5 words max) for the conversation. On all subsequent turns, leave the title field empty.
    8.  **Timezone:** When adding a task with a date, you MUST include the user's timezone from the input in the task object.
    9.  **Proactive Suggestions:** After providing a general knowledge answer or recommendation (like movie or book suggestions), proactively ask if the user wants to add a related task to their list. For example: "Would you like me to add 'Watch a thriller movie' to your tasks?". This should be part of your conversational 'response' and should not automatically create a task.

    **USER'S TASK LIST (for context, IDs are for your internal use ONLY):**
    {{#if tasks}}
      {{#each tasks}}
      - ID: {{this.id}}, Title: "{{this.title}}", Completed: {{this.completed}}{{#if this.scheduledDate}}, Scheduled: {{this.scheduledDate}}{{#if this.scheduledTime}} at {{this.scheduledTime}}{{/if}}{{/if}}{{#if this.subtasks}}, Subtasks: {{this.subtasks.length}}{{/if}}
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
const agentFlow = ai.defineFlow(
  {
    name: 'agentFlow',
    inputSchema: AgentInputSchema,
    outputSchema: AgentOutputSchema,
  },
  async (input) => {

    const { output } = await agentPrompt(input);
    if (!output) {
      // This case handles content filtering or other generation errors.
      throw new Error("The AI was unable to generate a response. This may be due to content safety filters. Please try rephrasing your request.");
    }
    return output;
  }
);
