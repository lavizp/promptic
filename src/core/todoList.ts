import type { Todo, TodoCategory } from '../types/todo.js';

const CATEGORY_ORDER: TodoCategory[] = ['work', 'fitness', 'personal'];

export function flattenTodos(todos: Todo[]): Todo[] {
  const daily = CATEGORY_ORDER.flatMap(cat =>
    todos.filter(t => t.category === cat && t.type === 'daily')
  );
  const backlog = todos.filter(t => t.type === 'backlog');
  return [...daily, ...backlog];
}
