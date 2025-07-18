
'use server';

/**
 * @fileOverview A new, robust AI assistant flow for directing actions.
 * This flow's primary job is to understand a user's command and create a
 * structured, executable plan. The plan is then returned to the UI for
 * user confirmation before any action is taken.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
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
  chatSessionId: z.string().optional().nullable().describe("The ID of the current chat session."),
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
  title: z.string().optional().nullable().describe("A short, concise title (4-5 words max) for this conversation. You should ONLY generate this on the very first turn of the conversation (when history has only one user message)."),
  response: z.string().describe("A concise, friendly summary of the plan you have generated, or a conversational response if you are asking for clarification or providing information. For example, 'I can add 2 tasks and delete 1.' or 'I've scheduled that for you.' or 'Which task are you referring to?'. If no actions are taken, provide a helpful conversational response or the direct result from a tool (like a summary or analysis)."),
  tasksToAdd: z.array(TaskToAddSchema).optional().nullable().describe("A list of new tasks to be added based on the user's command."),
  tasksToUpdate: z.array(TaskToUpdateSchema).optional().nullable().describe("A list of existing tasks to be updated."),
  tasksToDelete: z.array(TaskToDeleteSchema).optional().nullable().describe("A list of existing tasks to be deleted."),
  subtasksToAdd: z.array(SubtasksToAddSchema).optional().nullable().describe("A list of subtasks to add to existing parent tasks.")
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;


// The main exported function that the UI will call
export async function runAssistant(input: AssistantInput): Promise<AssistantOutput> {
  // We need to construct the full input for the prompt, including media from history
  const historyWithMedia = input.history.map(msg => {
    const content: any[] = [{ text: msg.content }];
    // This is where we re-integrate the media for the prompt, finding it from the full history passed from the client
    const fullMessage = (input as any).historyWithMedia?.find((h: any, i: number) => i === input.history.indexOf(msg));
    if (fullMessage?.mediaDataUri) {
        content.push({ media: { url: fullMessage.mediaDataUri } });
    }
    return { role: msg.role, content };
  });

  const promptInput = {
      ...input,
      history: historyWithMedia,
  };

  return assistantFlow(promptInput);
}

const FullMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.union([
      z.object({text: z.string()}),
      z.object({media: z.object({url: z.string()})})
  ])),
});

// Define the input schema for the assistant
const AssistantPromptInputSchema = z.object({
  history: z.array(FullMessageSchema).describe("The full conversation history between the user and the assistant, including any media."),
  tasks: z.array(z.any()).describe("The user's current list of tasks, including their IDs, titles, descriptions, and completion status."),
  role: z.string().describe("The user's self-selected role (e.g., 'Developer')."),
  date: z.string().describe("The current date in YYYY-MM-DD format."),
  chatSessionId: z.string().optional().nullable().describe("The ID of the current chat session."),
});


// Define the AI prompt. This is where we instruct the AI on how to behave.
const assistantPrompt = ai.definePrompt({
    name: 'assistantPrompt',
    input: { schema: AssistantPromptInputSchema },
    output: { schema: AssistantOutputSchema },
    tools: [
        breakdownTaskTool,
        generateLearningPlanTool,
        summarizeTaskTool,
        analyzeProductivityTool,
        reflectOnProgressTool,
    ],
    prompt: `You are FlowForge, an expert AI productivity assistant. Your goal is to have a conversation with the user and help them with any request. You can manage their tasks, answer questions, and provide analysis using your available tools.

    Current Date: {{{date}}}
    User's Role: {{{role}}}

    You have the user's current task list and the conversation history for context. You MUST use the provided task IDs when a tool requires one, but you MUST NOT mention the IDs in your conversational responses to the user.
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**:
      {{#each this.content}}
        {{#if this.text}}{{this.text}}{{/if}}
        {{#if this.media}}<media url="{{this.media.url}}"/>{{/if}}
      {{/each}}
    {{/each}}
    
    Based on the latest user message and the entire conversation, determine the next step.
    - If the user's request is a question, a request for an explanation (e.g., "explain Two Sum"), or a general conversational prompt, provide a direct, helpful, and comprehensive answer in the 'response' field. Do NOT create a task plan unless explicitly asked to. After providing the answer, you SHOULD proactively ask if the user wants to take the next step, such as creating a learning plan for the topic, or adding a task to practice the concept. For example: "Would you like me to create a learning plan for this?"
    - If the user's command is explicitly to add, update, or delete tasks, generate the appropriate plan of actions and a summary response.
    - If the user's request is best handled by one of your tools (like summarizing, analyzing, or generating a learning plan), use the tool and provide the result in your response.
    - If the user's request is unclear or you need more information to proceed, ask a clarifying question in your response and do not generate any actions.
    - If the command is simple small talk (e.g., "hello", "thank you"), just provide a friendly text response and do not generate any actions.
    - IMPORTANT: If this is the first turn of the conversation (i.e., the history only has one user message), you MUST generate a short, concise title (4-5 words max) for the conversation based on the user's request. On all subsequent turns, you must leave the title field empty.
    - IMPORTANT: If the user provides a file (image, document, etc.), you MUST use its content as the primary source of information to respond to their request. Do not ask for information that is likely contained within the file.

    User's Task List (for context, IDs are for your internal use ONLY):
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
    inputSchema: AssistantPromptInputSchema,
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
