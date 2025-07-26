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
