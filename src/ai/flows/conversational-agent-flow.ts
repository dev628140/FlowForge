
'use server';
/**
 * @fileOverview A conversational AI agent that can use tools to help users manage their tasks.
 *
 * - `conversationalAgent` - The main function that handles the conversational agent.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

import { naturalLanguageTaskPlanning } from './natural-language-task-planning';
import { getRoleBasedTaskSuggestions } from './role-based-task-suggestions';
import { generateLearningPlan } from './learning-plan-flow';
import { analyzeProductivity } from './productivity-dna-tracker';
import { progressReflectionJournal } from './progress-reflection-journal';
import { visualTaskSnap } from './visual-task-snap';
import { breakdownTask } from './breakdown-task-flow';
import { reorderAllTasks, ReorderAllTasksInput } from './reorder-all-tasks-flow';
import {
  ConversationalAgentInput,
  ConversationalAgentInputSchema,
  ConversationalAgentOutput,
  ConversationalAgentOutputSchema,
  NaturalLanguageTaskPlanningOutput,
  TaskSchema,
} from '@/lib/types/conversational-agent';


// Define tools that the conversational agent can use.
const taskPlanningTool = ai.defineTool(
    {
      name: 'naturalLanguageTaskPlanning',
      description: 'Breaks down a goal into actionable tasks and can schedule them over a period. Use this when a user asks to plan something, create a schedule, or add one or more tasks based on a high-level goal.',
      inputSchema: z.object({ goal: z.string() }),
      outputSchema: NaturalLanguageTaskPlanningOutput,
    },
    async (input) => naturalLanguageTaskPlanning(input)
);

const roleSuggestionsTool = ai.defineTool(
    {
        name: 'getRoleBasedTaskSuggestions',
        description: "Provides task suggestions, timeboxing advice, and motivation tailored to a user's role and mood. Use this when the user asks for suggestions, feels stuck, or mentions their emotional state.",
        inputSchema: z.object({ role: z.string(), userTask: z.string(), mood: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => getRoleBasedTaskSuggestions(input)
);

const learningPlanTool = ai.defineTool(
    {
        name: 'generateLearningPlan',
        description: "Creates a structured, step-by-step learning plan for a specific topic. Use this when the user wants to learn something new.",
        inputSchema: z.object({ topic: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => generateLearningPlan(input)
);

const productivityAnalysisTool = ai.defineTool(
    {
        name: 'analyzeProductivity',
        description: "Analyzes completed tasks to identify productivity patterns, peak times, and days. Use this when the user asks for their productivity report or wants to know when they are most productive.",
        inputSchema: z.object({ tasks: z.array(z.object({ title: z.string(), completedAt: z.string().optional(), description: z.string().optional(), scheduledDate: z.string().optional() })) }),
        outputSchema: z.any(),
    },
    async (input) => {
        // Filter for tasks that are actually completed before sending to the flow
        const completedTasks = input.tasks.filter(t => t.completedAt);
        return analyzeProductivity({ tasks: completedTasks });
    }
);

const progressJournalTool = ai.defineTool(
    {
        name: 'progressReflectionJournal',
        description: "Generates a motivational end-of-day summary based on completed tasks. Use this when the user asks to reflect on their day or wants a summary of their accomplishments.",
        inputSchema: z.object({ tasksCompleted: z.array(z.string()) }),
        outputSchema: z.any(),
    },
    async (input) => progressReflectionJournal(input)
);

const visualTaskSnapTool = ai.defineTool(
    {
        name: 'visualTaskSnap',
        description: "Extracts tasks from an image of handwritten notes. Use this when the user uploads or provides an image and asks to get tasks from it.",
        inputSchema: z.object({ imageDataUri: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => visualTaskSnap(input)
);

const breakdownTaskTool = ai.defineTool(
    {
        name: 'breakdownTask',
        description: "Breaks down a single larger task into smaller, actionable subtasks. Use this for a single, specific task, whereas `naturalLanguageTaskPlanning` is for higher-level goals.",
        inputSchema: z.object({ taskTitle: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => breakdownTask(input)
);

const reorderAllTasksTool = ai.defineTool(
  {
    name: 'reorderAllTasks',
    description: "Reorders tasks across multiple days to match the order of tasks on a specific 'template' day. Use when the user asks to apply one day's task order to all other days.",
    inputSchema: z.object({
      allTasks: z.array(TaskSchema),
      templateDate: z.string().describe('The date to use as the ordering template, in YYYY-MM-DD format.'),
    }),
    outputSchema: z.object({
      updates: z
        .array(
          z.object({
            taskId: z.string(),
            updates: z.object({ order: z.number() }),
          })
        )
        .describe('A list of tasks with their new order values.'),
    }),
  },
  async (input) => reorderAllTasks(input)
);


const updateTaskTool = ai.defineTool(
    {
        name: 'updateTask',
        description: "Updates one or more existing tasks. Use the user's request and the provided task list to identify the correct task(s) by their title, description, or other attributes. If the request is ambiguous (e.g., multiple tasks match), ask the user for clarification by describing the options, not by asking for an ID.",
        inputSchema: z.object({
            taskId: z.string().describe("The unique identifier of the task to update."),
            updates: z.object({
                title: z.string().optional(),
                description: z.string().optional(),
                completed: z.boolean().optional(),
                scheduledDate: z.string().optional().describe("Date in YYYY-MM-DD format."),
            }).describe("The fields to update.")
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ taskId, updates }) => {
        // This is a placeholder. The actual update will be handled client-side
        // by interpreting the `tasksToUpdate` field in the agent's output.
        console.log(`AI requests to update task ${taskId} with`, updates);
        return { success: true };
    }
);

const deleteTaskTool = ai.defineTool(
    {
        name: 'deleteTask',
        description: "Deletes one or more tasks. Use the user's request and the provided task list to identify the correct task(s) by their title, description, or other attributes. If the request is ambiguous (e.g., multiple tasks match), ask the user for clarification by describing the options, not by asking for an ID. If the user confirms to delete multiple tasks, call this tool for each task.",
        inputSchema: z.object({ taskId: z.string().describe("The unique identifier of the task to delete.") }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ taskId }) => {
        // This is a placeholder. The actual deletion will be handled client-side
        // by interpreting the `tasksToDelete` field in the agent's output.
        console.log(`AI requests to delete task ${taskId}`);
        return { success: true };
    }
);


const conversationalAgentFlow = ai.defineFlow(
  {
    name: 'conversationalAgentFlow',
    inputSchema: ConversationalAgentInputSchema,
    outputSchema: ConversationalAgentOutputSchema,
  },
  async (input) => {
    const { history, prompt, initialContext, taskContext, imageDataUri, activeTool } = input;
    
    // Initialize a default result object that matches the output schema.
    const result: ConversationalAgentOutput = {
      response: '',
      tasksToAdd: [],
      tasksToUpdate: [],
      tasksToDelete: [],
    };

    // Direct path for reorder tool to avoid LLM confusion
    if (activeTool === 'reorderAllTasks') {
        const reorderInput: ReorderAllTasksInput = {
            allTasks: taskContext.tasks,
            templateDate: taskContext.templateDate,
        };
        const reorderResult = await reorderAllTasks(reorderInput);
        if (reorderResult.updates.length > 0) {
            result.response = `I've reordered your tasks on other days to match the order for ${taskContext.templateDate}.`;
            result.tasksToUpdate = reorderResult.updates;
        } else {
            result.response = "I couldn't find any tasks to reorder based on today's schedule.";
        }
        return result;
    }
    
    // Construct the full history for the model
    const fullHistory = history.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    // If an image is provided, add a system message to guide the AI
    let finalPrompt = prompt;
    if (imageDataUri) {
        fullHistory.unshift({ role: 'user', content: [{ media: { url: imageDataUri } }, { text: prompt }] });
        finalPrompt = `The user has uploaded an image and prompted: "${prompt}". Your default action should be to analyze this image for tasks using the 'visualTaskSnap' tool, but also be ready to answer other questions about it.`;
    }

    const tools = [
        taskPlanningTool, 
        roleSuggestionsTool,
        learningPlanTool,
        productivityAnalysisTool,
        progressJournalTool,
        visualTaskSnapTool,
        breakdownTaskTool,
        reorderAllTasksTool,
        updateTaskTool,
        deleteTaskTool,
    ];

    const systemPrompt = `${initialContext || 'You are a helpful productivity assistant named FlowForge.'}
You have a set of tools available: ${tools.map(t => t.name).join(', ')}.
Based on the user's prompt, you MUST decide if a tool is appropriate. If so, call the tool. If not, respond conversationally.
You should ask for clarification if a user's request is ambiguous.

If the user provides an image, your primary tool should be 'visualTaskSnap'.
If the user mentions their feelings or asks for ideas, consider 'getRoleBasedTaskSuggestions'.
If the user wants to plan a large goal or create any new task, use 'naturalLanguageTaskPlanning'.
If the user wants to break down one specific task, use 'breakdownTask'.
If the user asks to learn something, use 'generateLearningPlan'.
If the user asks for a report on their work, use 'analyzeProductivity'.
If the user wants a summary of completed tasks, use 'progressReflectionJournal'.
If the user asks to reorder tasks across multiple days based on a template (e.g., "make all days look like today"), use 'reorderAllTasks'. For simple up/down reordering of one task, use 'updateTask'.
For any task modifications (update, delete), use the appropriate 'updateTask' or 'deleteTask' tools.

${activeTool ? `The user has the '${activeTool}' tool active. Prioritize using this tool if the conversation aligns with its purpose. However, you can still use other tools or answer conversationally if the user's prompt deviates.` : ''}

You have full context of the user's task list. Your primary role is to provide information and suggestions based on the conversation.

Today's date is ${new Date().toISOString().split('T')[0]}.
The user has selected the role: ${taskContext.role}.
User's Task Context (including IDs, titles, descriptions, and completion status):
${taskContext.tasks ? JSON.stringify(taskContext.tasks, null, 2) : "No task context provided."}
`;
    
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      system: systemPrompt,
      history: fullHistory,
      prompt: finalPrompt,
      tools,
      config: {
        temperature: 0.3,
      },
    });

    const toolCalls = response.toolCalls;

    if (toolCalls && toolCalls.length > 0) {
        const taskPlanningCall = toolCalls.find(call => call.toolName === 'naturalLanguageTaskPlanning');
        if (taskPlanningCall && taskPlanningCall.output) {
            const tasks = taskPlanningCall.output.tasks || [];
            if (tasks.length > 0) {
                result.response = `OK. I've added ${tasks.length} task(s) to your list.`;
                result.tasksToAdd = tasks;
            } else {
                result.response = "I couldn't identify any tasks to add from your request.";
            }
        } else {
          // Handle other tool calls here if necessary in the future
          result.response = response.text || "I've processed your request using a tool.";
        }
    } else {
        result.response = response.text;
    }
    
    return result;

  }
);

export async function conversationalAgent(input: ConversationalAgentInput): Promise<ConversationalAgentOutput> {
    return conversationalAgentFlow(input);
}
