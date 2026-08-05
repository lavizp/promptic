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

const cat = (t: Todo) => t.category;

describe("buildRows", () => {
  it("emits a category header followed by its items, in category order", () => {
    const rows = buildRows(['default', 'work'], [todo(1, 'work'), todo(2, 'default')], cat);
    expect(rows).toEqual([
      { kind: 'category', name: 'default', count: 1 },
      { kind: 'item', item: expect.objectContaining({ id: 2 }) },
      { kind: 'category', name: 'work', count: 1 },
      { kind: 'item', item: expect.objectContaining({ id: 1 }) },
    ]);
  });

  it("keeps item order as given within each category", () => {
    const rows = buildRows(['work'], [todo(3, 'work'), todo(1, 'work'), todo(2, 'work')], cat);
    const ids = rows.filter(r => r.kind === 'item').map(r => (r.kind === 'item' ? r.item.id : -1));
    expect(ids).toEqual([3, 1, 2]);
  });

  it("renders a header-only section for empty categories", () => {
    const rows = buildRows(['default', 'empty'], [todo(1, 'default')], cat);
    expect(rows).toEqual([
      { kind: 'category', name: 'default', count: 1 },
      { kind: 'item', item: expect.objectContaining({ id: 1 }) },
      { kind: 'category', name: 'empty', count: 0 },
    ]);
  });

  it("returns no rows for no categories", () => {
    expect(buildRows([], [todo(1, 'work')], cat)).toEqual([]);
  });
});
