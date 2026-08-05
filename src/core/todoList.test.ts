import { describe, it, expect } from "vitest";
import { flattenTodos } from "./todoList.ts";
import type { Todo } from "../types/todo.ts";

const todo = (id: number, category: string, type: string, status: string): Todo => ({
  id,
  description: `task ${id}`,
  category: category as Todo['category'],
  type: type as Todo['type'],
  status: status as Todo['status'],
  created_at: `2026-01-01 00:00:0${id}`,
  completed_at: null,
});

describe("flattenTodos", () => {
  it("returns daily todos grouped by category in order", () => {
    const todos = [
      todo(1, 'fitness', 'daily', 'pending'),
      todo(2, 'work', 'daily', 'pending'),
      todo(3, 'personal', 'daily', 'pending'),
      todo(4, 'work', 'daily', 'completed'),
    ];
    expect(flattenTodos(todos).map(t => t.id)).toEqual([2, 4, 1, 3]);
  });

  it("places backlog after all daily todos", () => {
    const todos = [
      todo(1, 'work', 'backlog', 'pending'),
      todo(2, 'personal', 'daily', 'pending'),
      todo(3, 'fitness', 'backlog', 'pending'),
    ];
    expect(flattenTodos(todos).map(t => t.id)).toEqual([2, 1, 3]);
  });

  it("keeps relative order within each group", () => {
    const todos = [
      todo(1, 'work', 'daily', 'pending'),
      todo(2, 'work', 'daily', 'pending'),
      todo(3, 'work', 'backlog', 'pending'),
      todo(4, 'work', 'backlog', 'pending'),
    ];
    expect(flattenTodos(todos).map(t => t.id)).toEqual([1, 2, 3, 4]);
  });

  it("returns an empty list for no todos", () => {
    expect(flattenTodos([])).toEqual([]);
  });
});
