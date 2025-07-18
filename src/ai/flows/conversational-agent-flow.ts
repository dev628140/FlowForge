
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
import {
  ConversationalAgentInput,
  ConversationalAgentInputSchema,
  ConversationalAgentOutput,
  ConversationalAgentOutputSchema,
} from '@/lib/types/conversational-agent';

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
        inputSchema: z.object({ tasks: z.array(z.object({ title: z.string(), completedAt: z.string() })) }),
        outputSchema: z.any(),
    },
    async (input) => analyzeProductivity(input)
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


const conversationalAgentFlow = ai.defineFlow(
  {
    name: 'conversationalAgentFlow',
    inputSchema: ConversationalAgentInputSchema,
    outputSchema: ConversationalAgentOutputSchema,
  },
  async (input) => {
    const { history, prompt, initialContext, taskContext } = input;
    
    // Construct the full history for the model
    const fullHistory = history.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }]
    }));

    const tools = [
        taskPlanningTool, 
        roleSuggestionsTool,
        learningPlanTool,
        productivityAnalysisTool,
        progressJournalTool,
        visualTaskSnapTool,
        breakdownTaskTool,
    ];
    
    let retries = 3;
    let delay = 1000; // start with 1 second

    while (retries > 0) {
        try {
            const response = await ai.generate({
              model: 'googleai/gemini-1.5-flash-latest',
              system: `${initialContext || 'You are a helpful productivity assistant named FlowForge.'}
You are a helpful assistant. Your primary role is to provide information and suggestions based on the conversation context.
If the user explicitly asks you to create tasks, plan something, or add items to their list, you should generate a conversational response and ALSO populate the 'tasksToAdd' array in the JSON output. 
Confirm details with the user if their request is ambiguous.
When you need to use a tool, use it, but your final response should always be conversational and directed to the user.

User's Task Context:
${taskContext ? JSON.stringify(taskContext, null, 2) : "No tasks provided."}
`,
              history: fullHistory,
              prompt: prompt,
              tools,
              output: {
                  format: 'json',
                  schema: ConversationalAgentOutputSchema,
              },
              config: {
                temperature: 0.3,
              },
            });

            const output = response.output;
            
            if (!output) {
              // This is the key change: handle the null output case gracefully.
              return { response: "I'm sorry, the AI returned an empty response. This might be due to a content filter or a temporary issue. Please try rephrasing your request." };
            }
            
            return output;

        } catch (error: any) {
             const errorMessage = error.message || '';
            // Check for specific error types that are retryable or user-facing
            if (errorMessage.includes('429') || errorMessage.includes('exceeded your current quota')) {
                 throw new Error("You've exceeded the daily limit for the AI. The quota will reset at midnight PT. Please try again tomorrow.");
            }
            if (errorMessage.includes('503 Service Unavailable')) {
                retries--;
                if (retries === 0) {
                    throw new Error("The AI model is currently overloaded. Please try again in a few moments.");
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                // For any other error, throw it immediately
                console.error("Unhandled AI Error:", error);
                throw new Error("An unexpected error occurred with the AI service.");
            }
        }
    }

    // This should not be reached, but as a fallback
    return { response: "I'm sorry, I couldn't generate a response after several attempts. Please try again later." };
  }
);

export async function conversationalAgent(input: ConversationalAgentInput): Promise<ConversationalAgentOutput> {
    return conversationalAgentFlow(input);
}
