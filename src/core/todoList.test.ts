import { describe, it, expect } from "vitest";
import { buildRows } from "./todoList.ts";
import type { Todo } from "../types/todo.ts";

const todo = (id: number, category: string, status: string = 'pending'): Todo => ({
  id,
  description: `task ${id}`,
  category,
  status: status as Todo['status'],
  created_at: `2026-01-01 00:00:0${id}`,
  completed_at: null,
});

describe("buildRows", () => {
  it("emits a category header followed by its todos, in category order", () => {
    const rows = buildRows(['default', 'work'], [
      todo(1, 'work'),
      todo(2, 'default'),
    ]);
    expect(rows).toEqual([
      { kind: 'category', name: 'default', count: 1 },
      { kind: 'todo', todo: expect.objectContaining({ id: 2 }) },
      { kind: 'category', name: 'work', count: 1 },
      { kind: 'todo', todo: expect.objectContaining({ id: 1 }) },
    ]);
  });

  it("keeps todo order as given within each category", () => {
    const rows = buildRows(['work'], [todo(3, 'work'), todo(1, 'work'), todo(2, 'work')]);
    const todos = rows.filter(r => r.kind === 'todo').map(r => (r.kind === 'todo' ? r.todo.id : -1));
    expect(todos).toEqual([3, 1, 2]);
  });

  it("renders a header-only section for empty categories", () => {
    const rows = buildRows(['default', 'empty'], [todo(1, 'default')]);
    expect(rows).toEqual([
      { kind: 'category', name: 'default', count: 1 },
      { kind: 'todo', todo: expect.objectContaining({ id: 1 }) },
      { kind: 'category', name: 'empty', count: 0 },
    ]);
  });

  it("returns no rows for no categories", () => {
    expect(buildRows([], [todo(1, 'work')])).toEqual([]);
  });
});
