
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { breakdownTask as breakdownTaskFlow } from './flows/breakdown-task-flow';
import { generateLearningPlan as generateLearningPlanFlow } from './flows/learning-plan-flow';
import { summarizeTask as summarizeTaskFlow } from './flows/summarize-task';
import { analyzeProductivity as analyzeProductivityFlow } from './flows/productivity-dna-tracker';
import { progressReflectionJournal as progressReflectionJournalFlow } from './flows/progress-reflection-journal';
import type { Task } from '@/lib/types';


/**
 * Tool to break down a specified task into subtasks.
 */
export const breakdownTaskTool = ai.defineTool(
    {
        name: 'breakdownTask',
        description: 'Breaks down a complex task into a series of smaller, actionable subtasks.',
        inputSchema: z.object({
            taskId: z.string().describe("The unique ID of the task to break down."),
            taskTitle: z.string().describe("The title of the task to break down."),
        }),
        outputSchema: z.object({
            parentId: z.string(),
            subtasks: z.array(z.object({ title: z.string() })),
        }),
    },
    async ({ taskId, taskTitle }) => {
        const result = await breakdownTaskFlow({ taskTitle });
        return {
            parentId: taskId,
            subtasks: result.subtasks.map(title => ({ title })),
        };
    }
);

/**
 * Tool to generate a learning plan for a given topic.
 */
export const generateLearningPlanTool = ai.defineTool(
    {
        name: 'generateLearningPlan',
        description: 'Creates a structured, step-by-step learning plan for a given topic and returns it as a list of tasks.',
        inputSchema: z.object({
            topic: z.string().describe('The topic the user wants to learn about.'),
        }),
        outputSchema: z.object({
            tasksToAdd: z.array(z.object({
                title: z.string(),
                description: z.string(),
            })),
        }),
    },
    async ({ topic }) => {
        const result = await generateLearningPlanFlow({ topic });
        return {
            tasksToAdd: result.learning_plan.map(step => ({
                title: step.title,
                description: `${step.description} (Est: ${step.estimated_time})`,
            })),
        };
    }
);

/**
 * Tool to summarize a given task.
 */
export const summarizeTaskTool = ai.defineTool(
    {
        name: 'summarizeTask',
        description: 'Summarizes the key points and action items for a given task.',
        inputSchema: z.object({
            taskTitle: z.string().describe('The title of the task to summarize.'),
            taskDescription: z.string().optional().describe('The description of the task for extra context.'),
        }),
        outputSchema: z.string().describe('The summary of the task.'),
    },
    async (input) => {
        const result = await summarizeTaskFlow(input);
        return result.summary;
    }
);

// Define a schema for the task object to be used in the tools below.
// This provides a clear structure for the AI.
const ToolTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    completedAt: z.string().optional(),
    scheduledDate: z.string().optional(),
    order: z.number().optional().nullable(),
});


/**
 * Tool to analyze user's productivity based on completed tasks.
 */
export const analyzeProductivityTool = ai.defineTool(
    {
        name: 'analyzeProductivity',
        description: "Analyzes the user's completed tasks to find patterns, like most productive days and times.",
        inputSchema: z.object({
            tasks: z.array(ToolTaskSchema).describe("The user's list of tasks, especially completed ones with timestamps."),
        }),
        outputSchema: z.string().describe('A markdown-formatted report of the productivity analysis.'),
    },
    async ({ tasks }) => {
        const completedTasks = tasks
            .filter(t => t.completed && t.completedAt)
            .map(t => ({ title: t.title, completedAt: t.completedAt as string }));
        
        const result = await analyzeProductivityFlow({ tasks: completedTasks });
        return result.report;
    }
);

/**
 * Tool to generate a motivational reflection on completed tasks.
 */
export const reflectOnProgressTool = ai.defineTool(
    {
        name: 'reflectOnProgress',
        description: "Generates a motivational summary of the user's accomplishments based on tasks they completed today.",
        inputSchema: z.object({
            tasks: z.array(ToolTaskSchema).describe("The user's list of tasks."),
            date: z.string().describe("The current date in YYYY-MM-DD format to identify today's tasks."),
        }),
        outputSchema: z.string().describe('A motivational summary.'),
    },
    async ({ tasks, date }) => {
        const completedToday = tasks
            .filter(t => t.completed && t.scheduledDate === date)
            .map(t => t.title);

        if (completedToday.length === 0) {
            return "You haven't completed any tasks scheduled for today yet. Let's get one done!";
        }

        const result = await progressReflectionJournalFlow({ tasksCompleted: completedToday });
        return result.summary;
    }
);

/**
 * Tool to reorder a list of tasks based on a natural language command.
 */
export const reorderTasksTool = ai.defineTool(
    {
        name: 'reorderTasksTool',
        description: 'Reorders a given list of tasks for a single day based on a natural language command (e.g., "put the last task first", "move X after Y").',
        inputSchema: z.object({
            tasks: z.array(ToolTaskSchema).describe("The list of tasks for a single day, with their current order."),
            command: z.string().describe("The user's natural language command for reordering."),
        }),
        outputSchema: z.object({
            tasksToUpdate: z.array(z.object({
                taskId: z.string(),
                updates: z.object({
                    order: z.number(),
                }),
            })).describe("The list of tasks with their new calculated order values.")
        }),
    },
    async ({ tasks, command }) => {
        // The AI will determine the new order based on the command.
        // It's a complex task for an LLM, so we provide a very structured prompt for it.
        const reorderPrompt = `You are a task reordering specialist. Given a list of tasks with their current order, and a command, your job is to determine the new order for each task. You must output a new list of all the original tasks, each with its new calculated 'order' property. The new order values should be simple integers starting from 0.

        Current Tasks (with their existing order):
        ${tasks.map(t => `- ID: ${t.id}, Title: "${t.title}", Current Order: ${t.order}`).join('\n')}

        User's Reorder Command: "${command}"

        Now, generate the full list of tasks with their new order values.
        `;

        const ReorderOutputSchema = z.object({
            reorderedTasks: z.array(z.object({
                id: z.string(),
                title: z.string(),
                order: z.number(),
            }))
        });

        const { output } = await ai.generate({
            prompt: reorderPrompt,
            output: {
                schema: ReorderOutputSchema,
            },
        });

        if (!output || !output.reorderedTasks) {
            throw new Error("Could not determine the new task order.");
        }

        const updates = output.reorderedTasks.map(task => ({
            taskId: task.id,
            updates: {
                order: task.order,
            },
        }));

        return { tasksToUpdate: updates };
    }
);
