import { getDb } from '../db/schema.js';
import type { Todo, TodoCategory, TodoStatus } from '../types/todo.js';

export function addTodo(description: string, category: TodoCategory): Todo {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO todos (description, category) VALUES (?, ?)'
  );
  const result = stmt.run(description, category);
  return getTodo(result.lastInsertRowid as number)!;
}

export function getTodo(id: number): Todo | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
}

export function getAllTodos(): Todo[] {
  const db = getDb();
  return db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all() as Todo[];
}

export function getTodosByCategory(): Record<TodoCategory, Todo[]> {
  const todos = getAllTodos();
  const result: Record<TodoCategory, Todo[]> = { work: [], fitness: [], personal: [] };
  for (const todo of todos) {
    result[todo.category].push(todo);
  }
  return result;
}

export function toggleTodo(id: number): Todo | undefined {
  const db = getDb();
  const todo = getTodo(id);
  if (!todo) return undefined;
  if (todo.status === 'pending') {
    db.prepare("UPDATE todos SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE todos SET status = 'pending', completed_at = NULL WHERE id = ?").run(id);
  }
  return getTodo(id);
}

export function rolloverDaily(): number {
  const db = getDb();
  const lastRun = db.prepare("SELECT value FROM meta WHERE key = 'last_run_date'").get() as { value: string } | undefined;
  const today = new Date().toISOString().slice(0, 10);
  if (lastRun?.value === today) return 0;
  const result = db.prepare(
    "UPDATE todos SET type = 'backlog' WHERE type = 'daily' AND status = 'pending'"
  ).run();
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('last_run_date', today);
  return result.changes;
}
