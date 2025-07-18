
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
import { reorderAllTasks } from './reorder-all-tasks-flow';
import {
  ConversationalAgentInput,
  ConversationalAgentInputSchema,
  ConversationalAgentOutput,
  ConversationalAgentOutputSchema,
} from '@/lib/types/conversational-agent';
import { Task } from '@/lib/types';


// Define tools that the conversational agent can use.
const taskPlanningTool = ai.defineTool(
    {
      name: 'naturalLanguageTaskPlanning',
      description: 'Breaks down a goal into actionable tasks and can schedule them over a period. Use this when a user asks to plan something, create a schedule, or add multiple tasks based on a high-level goal.',
      inputSchema: z.object({ goal: z.string() }),
      outputSchema: z.any(),
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
      allTasks: z.array(z.any()), // Full list of tasks
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
IMPORTANT: When responding conversationally, just provide a text response. When using a tool or performing an action (adding, updating, deleting tasks), you MUST respond with a JSON object that follows the specified output schema, including a 'response' field with your conversational text.

If the user provides an image, your primary tool should be 'visualTaskSnap'.
If the user mentions their feelings or asks for ideas, consider 'getRoleBasedTaskSuggestions'.
If the user wants to plan a large goal, use 'naturalLanguageTaskPlanning'.
If the user wants to break down one specific task, use 'breakdownTask'.
If the user asks to learn something, use 'generateLearningPlan'.
If the user asks for a report on their work, use 'analyzeProductivity'.
If the user wants a summary of completed tasks, use 'progressReflectionJournal'.
If the user asks to reorder tasks across multiple days based on a template (e.g., "make all days look like today"), use 'reorderAllTasks'. For simple up/down reordering of one task, use 'updateTask'.
For any task modifications (update, delete), use the appropriate 'updateTask' or 'deleteTask' tools.

After using the 'reorderAllTasks' tool, you will receive an object with an 'updates' field. You MUST place the contents of this 'updates' array into the 'tasksToUpdate' field of your final response object.

${activeTool ? `The user has the '${activeTool}' tool active. Prioritize using this tool if the conversation aligns with its purpose. However, you can still use other tools or answer conversationally if the user's prompt deviates.` : ''}

You have full context of the user's task list. Your primary role is to provide information and suggestions based on the conversation.

Today's date is ${new Date().toISOString().split('T')[0]}.
The user has selected the role: ${taskContext.role}.
User's Task Context (including IDs, titles, descriptions, and completion status):
${taskContext.tasks ? JSON.stringify(taskContext.tasks, null, 2) : "No task context provided."}
`;
    
    let retries = 3;
    let delay = 1000; // start with 1 second

    while (retries > 0) {
        try {
            const response = await ai.generate({
              model: 'googleai/gemini-1.5-flash-latest',
              system: systemPrompt,
              history: fullHistory,
              prompt: finalPrompt,
              tools,
              output: {
                  schema: z.union([ConversationalAgentOutputSchema, z.string()]),
              },
              config: {
                temperature: 0.3,
              },
            });

            const output = response.output;
            
            if (!output) {
              return { response: "I'm sorry, the AI returned an empty response. This might be due to a content filter or a temporary issue. Please try rephrasing your request." };
            }

            if (typeof output === 'string') {
              return { response: output };
            }
            
            // Handle the case where the reorder tool was called and its result is in the history.
            const reorderToolCall = response.history.find(m => m.role === 'tool' && m.content[0].toolResponse?.name === 'reorderAllTasks');
            if (reorderToolCall) {
                const toolOutput = reorderToolCall.content[0].toolResponse?.output as any;
                if (toolOutput?.updates) {
                    return {
                        ...output,
                        tasksToUpdate: toolOutput.updates,
                    };
                }
            }

            return output;

        } catch (error: any) {
             const errorMessage = error.message || '';
            if (errorMessage.includes('429') || errorMessage.includes('exceeded your current quota')) {
                 return { response: "You've exceeded the daily limit for the AI. The quota will reset at midnight PT. Please try again tomorrow." };
            }
            if (errorMessage.includes('503 Service Unavailable')) {
                retries--;
                if (retries === 0) {
                    return { response: "The AI model is currently overloaded. Please try again in a few moments." };
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                console.error("Unhandled AI Error:", error);
                const friendlyError = "I received an unexpected response from the AI. It might have been empty or in the wrong format. Could you please try rephrasing your request?";
                return { response: friendlyError };
            }
        }
    }

    return { response: "I'm sorry, I couldn't generate a response after several attempts. Please try again later." };
  }
);

export async function conversationalAgent(input: ConversationalAgentInput): Promise<ConversationalAgentOutput> {
    const result = await conversationalAgentFlow(input);
    
    // Final check to ensure reorder updates are passed through.
    if (result && result.tasksToUpdate && (result.tasksToUpdate as any).updates) {
      return {
        ...result,
        response: result.response || "I've reordered your tasks as requested.",
        tasksToUpdate: (result.tasksToUpdate as any).updates,
      };
    }

    return result;
}
