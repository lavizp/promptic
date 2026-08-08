import { getDb } from '../db/schema.js';
import type { Database } from 'bun:sqlite';
import type { Todo, Category } from '../types/todo.js';

const DEFAULT_CATEGORY = 'default';

function ensureCategory(db: Database, category: string): void {
  db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(category);
}

export function addTodo(description: string, category: string = DEFAULT_CATEGORY): Todo {
  const db = getDb();
  ensureCategory(db, category);
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

export function getCategories(): Category[] {
  const db = getDb();
  return db.prepare('SELECT * FROM categories ORDER BY created_at ASC, name ASC').all() as Category[];
}

export function addCategory(name: string): Category | undefined {
  const db = getDb();
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  ensureCategory(db, trimmed);
  return db.prepare('SELECT * FROM categories WHERE name = ?').get(trimmed) as Category | undefined;
}

export function removeCategory(name: string): void {
  const db = getDb();
  if (name === DEFAULT_CATEGORY) return;
  db.transaction(() => {
    db.prepare('UPDATE todos SET category = ? WHERE category = ?').run(DEFAULT_CATEGORY, name);
    db.prepare('DELETE FROM categories WHERE name = ?').run(name);
  })();
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

export function updateTodoDescription(id: number, description: string): Todo | undefined {
  const db = getDb();
  const trimmed = description.trim();
  if (!trimmed) return undefined;
  db.prepare('UPDATE todos SET description = ? WHERE id = ?').run(trimmed, id);
  return getTodo(id);
}

export function moveTodo(id: number, category: string): Todo | undefined {
  const db = getDb();
  ensureCategory(db, category);
  db.prepare('UPDATE todos SET category = ? WHERE id = ?').run(category, id);
  return getTodo(id);
}

export function deleteTodo(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
}
