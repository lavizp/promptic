import type { Todo } from '../types/todo.js';

export type TodoRow =
  | { kind: 'category'; name: string; count: number }
  | { kind: 'todo'; todo: Todo };

export function buildRows(categories: string[], todos: Todo[]): TodoRow[] {
  const byCategory = new Map<string, Todo[]>();
  for (const todo of todos) {
    const list = byCategory.get(todo.category);
    if (list) list.push(todo);
    else byCategory.set(todo.category, [todo]);
  }

  const rows: TodoRow[] = [];
  for (const name of categories) {
    const items = byCategory.get(name) ?? [];
    rows.push({ kind: 'category', name, count: items.length });
    for (const todo of items) rows.push({ kind: 'todo', todo });
  }
  return rows;
}
