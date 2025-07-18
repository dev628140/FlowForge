
'use server';

/**
 * @fileOverview An AI flow for reordering tasks across all days based on a template day.
 *
 * - `reorderAllTasks` - A function that calculates the new order for tasks.
 * - `ReorderAllTasksInput` - The input type for the function.
 * - `ReorderAllTasksOutput` - The output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Task } from '@/lib/types';

// We don't export the schemas anymore to comply with "use server" rules.
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number().optional(),
  scheduledDate: z.string().optional(),
});

const ReorderAllTasksInputSchema = z.object({
  allTasks: z.array(TaskSchema).describe('The complete list of all user tasks.'),
  templateDate: z
    .string()
    .describe('The date to use as the ordering template, in YYYY-MM-DD format.'),
});
export type ReorderAllTasksInput = z.infer<typeof ReorderAllTasksInputSchema>;

const ReorderAllTasksOutputSchema = z.object({
  updates: z
    .array(
      z.object({
        taskId: z.string(),
        updates: z.object({
          order: z.number(),
        }),
      })
    )
    .describe('A list of tasks with their new order values.'),
});
export type ReorderAllTasksOutput = z.infer<typeof ReorderAllTasksOutputSchema>;

export async function reorderAllTasks(
  input: ReorderAllTasksInput
): Promise<ReorderAllTasksOutput> {
  return reorderAllTasksFlow(input);
}

const reorderAllTasksFlow = ai.defineFlow(
  {
    name: 'reorderAllTasksFlow',
    inputSchema: ReorderAllTasksInputSchema,
    outputSchema: ReorderAllTasksOutputSchema,
  },
  async ({ allTasks, templateDate }) => {
    // 1. Get the tasks for the template date and their order.
    const templateTasks = allTasks
      .filter((t) => t.scheduledDate === templateDate)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (templateTasks.length === 0) {
      return { updates: [] }; // No template to work from
    }

    // Create a map of title to order from the template tasks
    const titleOrderMap = new Map<string, number>();
    templateTasks.forEach((task, index) => {
      // Use the index as the definitive order for the template
      if (!titleOrderMap.has(task.title)) {
        titleOrderMap.set(task.title, index);
      }
    });

    const updates: { taskId: string; updates: { order: number } }[] = [];

    // 2. Group all other tasks by their scheduled date.
    const tasksByDate: Record<string, Task[]> = {};
    allTasks.forEach((task) => {
      if (!task.scheduledDate || task.scheduledDate === templateDate) return;
      if (!tasksByDate[task.scheduledDate]) {
        tasksByDate[task.scheduledDate] = [];
      }
      tasksByDate[task.scheduledDate].push(task as Task);
    });

    // 3. For each date, re-order the tasks based on the template.
    for (const date in tasksByDate) {
      const dailyTasks = tasksByDate[date];

      // Create a new ordered list for this day
      const reorderedDailyTasks = dailyTasks.sort((a, b) => {
        const orderA = titleOrderMap.get(a.title) ?? Infinity;
        const orderB = titleOrderMap.get(b.title) ?? Infinity;
        
        // If one isn't in the template, it goes to the end
        if (orderA === Infinity && orderB !== Infinity) return 1;
        if (orderA !== Infinity && orderB === Infinity) return -1;
        
        // If both are in the template, sort by their template order
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // If titles have same template order or are not in template, maintain original relative order
        return (a.order || 0) - (b.order || 0);
      });

      // 4. Generate the update objects with new order values.
      reorderedDailyTasks.forEach((task, index) => {
        const newOrder = index;
        if (task.order !== newOrder) {
          updates.push({
            taskId: task.id,
            updates: { order: newOrder },
          });
        }
      });
    }

    return { updates };
  }
);
