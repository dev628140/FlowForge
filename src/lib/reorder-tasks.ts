
import type { Task } from './types';

/**
 * Calculates the new order values for two adjacent tasks.
 * @param taskId The ID of the task to move.
 * @param direction The direction to move the task ('up' or 'down').
 * @param taskList The list of tasks to reorder (e.g., today's tasks).
 * @returns An array of task objects with updated `order` properties, or an empty array if no move is possible.
 */
export function reorderTasks(
  taskId: string,
  direction: 'up' | 'down',
  taskList: Task[]
): { id: string; order: number }[] {
  const taskIndex = taskList.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    console.error("Task not found in the provided list.");
    return [];
  }

  const taskToMove = taskList[taskIndex];
  let adjacentTask: Task | undefined;

  if (direction === 'up' && taskIndex > 0) {
    adjacentTask = taskList[taskIndex - 1];
  } else if (direction === 'down' && taskIndex < taskList.length - 1) {
    adjacentTask = taskList[taskIndex + 1];
  }

  if (!adjacentTask) {
    return []; // Cannot move further in this direction
  }

  // Simple swap of order values
  const newOrderForTaskToMove = adjacentTask.order;
  const newOrderForAdjacentTask = taskToMove.order;

  return [
    { id: taskToMove.id, order: newOrderForTaskToMove! },
    { id: adjacentTask.id, order: newOrderForAdjacentTask! },
  ];
}
