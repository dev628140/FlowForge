
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
import { getDynamicSuggestions } from './dynamic-suggestions-flow';
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

const dynamicSuggestionsTool = ai.defineTool(
    {
        name: 'getDynamicSuggestions',
        description: "Provides 'next best action' suggestions based on the user's current tasks and role. Use this when the user asks 'what should I do next?' or wants recommendations.",
        inputSchema: z.object({ tasks: z.array(z.object({ title: z.string(), completed: z.boolean() })), role: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => getDynamicSuggestions(input)
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
        dynamicSuggestionsTool,
        visualTaskSnapTool,
        breakdownTaskTool,
    ];

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      system: `${initialContext || 'You are a helpful productivity assistant named FlowForge.'}
The user is providing you with their current task list as context.
You can use the available tools to help the user manage their tasks, get suggestions, and analyze their productivity.
If you use the 'naturalLanguageTaskPlanning' tool, the user wants you to create tasks for them.
After a tool returns tasks, confirm with the user and then format your final response as a JSON object containing both your text response and the list of tasks to be added under the 'tasksToAdd' key.

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

    const output = response.output();
    
    if (!output) {
      return { response: "I'm sorry, I couldn't generate a response. Please try again." };
    }

    return output;
  }
);

export async function conversationalAgent(input: ConversationalAgentInput): Promise<ConversationalAgentOutput> {
    return conversationalAgentFlow(input);
}
