import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { ScrollBoxRenderable } from "@opentui/core";
import {
  addCategory,
  addTodo,
  deleteTodo,
  getAllTodos,
  getCategories,
  moveTodo,
  removeCategory,
  toggleTodo,
  updateTodoDescription,
} from "../../core/todoEngine.js";
import { buildRows } from "../../core/todoList.js";
import type { Todo, Category } from "../../types/todo.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

const DEFAULT_CATEGORY = 'default';

type Mode =
  | { name: 'browse' }
  | { name: 'addTodo'; category: string }
  | { name: 'editTodo'; todoId: number }
  | { name: 'addCategory' }
  | { name: 'moveTodo'; todoId: number; pick: number }
  | { name: 'removeCategory'; category: string }
  | { name: 'detail'; todoId: number };

interface TodoViewProps {
  onExit: () => void;
}

export function TodoView({ onExit }: TodoViewProps) {
  const [categories, setCategories] = useState<Category[]>(() => getCategories());
  const [todos, setTodos] = useState<Todo[]>(() => getAllTodos());
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>({ name: 'browse' });
  const [draft, setDraft] = useState('');
  const listRef = useRef<ScrollBoxRenderable>(null);

  const refresh = () => {
    setCategories(getCategories());
    setTodos(getAllTodos());
  };

  const backToBrowse = () => {
    setMode({ name: 'browse' });
    setDraft('');
  };

  const rows = buildRows(categories.map(c => c.name), todos, t => t.category);
  const current = rows[cursor];

  useEffect(() => {
    if (cursor >= rows.length) {
      setCursor(Math.max(0, rows.length - 1));
    }
  }, [rows.length, cursor]);

  useEffect(() => {
    listRef.current?.scrollChildIntoView(`todo-row-${cursor}`);
  }, [cursor]);

  const sel = (i: number) => (cursor === i ? { fg: 'black' as const, bg: 'cyan' as const } : {});

  useKeyboard((key) => {
    // Single-key shortcuts are plain presses only. The parser maps control
    // bytes (e.g. Ctrl+D) to letter names, which must not trigger actions.
    if (key.ctrl || key.meta) return;
    switch (mode.name) {
      case 'addTodo':
      case 'editTodo':
      case 'addCategory':
        if (key.name === 'escape') backToBrowse();
        return;

      case 'moveTodo': {
        if (key.name === 'escape') {
          backToBrowse();
        } else if (key.name === 'up' || key.name === 'k') {
          setMode(m => m.name === 'moveTodo' ? { ...m, pick: Math.max(0, m.pick - 1) } : m);
        } else if (key.name === 'down' || key.name === 'j') {
          setMode(m => m.name === 'moveTodo' ? { ...m, pick: Math.min(categories.length - 1, m.pick + 1) } : m);
        } else if (key.name === 'return') {
          const cat = categories[mode.pick];
          if (cat) {
            moveTodo(mode.todoId, cat.name);
            refresh();
          }
          backToBrowse();
        }
        return;
      }

      case 'removeCategory': {
        if (key.name === 'y') {
          removeCategory(mode.category);
          refresh();
          backToBrowse();
        } else if (key.name === 'n' || key.name === 'escape') {
          backToBrowse();
        }
        return;
      }

      case 'detail': {
        if (key.name === 'escape' || key.name === 'return' || key.name === 'space') backToBrowse();
        return;
      }

      case 'browse': {
        switch (key.name) {
          case 'up':
          case 'k':
            setCursor(i => Math.max(0, i - 1));
            break;
          case 'down':
          case 'j':
            setCursor(i => Math.min(rows.length - 1, i + 1));
            break;
          case 'space':
          case 'x':
            if (current?.kind === 'item') {
              toggleTodo(current.item.id);
              refresh();
            }
            break;
          case 'a': {
            const target = current?.kind === 'category'
              ? current.name
              : current?.kind === 'item'
                ? current.item.category
                : DEFAULT_CATEGORY;
            setDraft('');
            setMode({ name: 'addTodo', category: target });
            break;
          }
          case 'e':
            if (current?.kind === 'item') {
              setDraft(current.item.description);
              setMode({ name: 'editTodo', todoId: current.item.id });
            }
            break;
          case 'return':
            if (current?.kind === 'item') setMode({ name: 'detail', todoId: current.item.id });
            break;
          case 'm':
            if (current?.kind === 'item') setMode({ name: 'moveTodo', todoId: current.item.id, pick: 0 });
            break;
          case 'd':
            if (current?.kind === 'item') {
              deleteTodo(current.item.id);
              refresh();
            } else if (current?.kind === 'category' && current.name !== DEFAULT_CATEGORY) {
              setMode({ name: 'removeCategory', category: current.name });
            }
            break;
          case 'c':
            setDraft('');
            setMode({ name: 'addCategory' });
            break;
          case 'escape':
            onExit();
            break;
        }
        return;
      }
    }
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox ref={listRef} scrollY flexGrow={1} padding={1}>
        {rows.length === 0 && <text fg="gray">No categories yet. Press c to create one.</text>}
        {rows.map((row, i) =>
          row.kind === 'category' ? (
            <box key={`cat-${row.name}`} id={`todo-row-${i}`} marginTop={i === 0 ? 0 : 1}>
              <text {...sel(i)}>{cursor === i ? '▸ ' : '  '}{row.name.toUpperCase()} ({row.count})</text>
            </box>
          ) : (
            <box key={`todo-${row.item.id}`} id={`todo-row-${i}`} marginLeft={1}>
              <text {...sel(i)}>
                {cursor === i ? '▸ ' : '  '}
                {row.item.status === 'completed' ? '☑' : '☐'} {row.item.description}
              </text>
            </box>
          )
        )}
      </scrollbox>

      {mode.name === 'addTodo' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[{mode.category}]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => {
              const desc = String(v).trim();
              if (desc) {
                addTodo(desc, mode.category);
                refresh();
              }
              backToBrowse();
            }}
            placeholder="New todo description…"
            focused
          />
        </box>
      )}

      {mode.name === 'editTodo' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[edit]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => {
              const desc = String(v).trim();
              if (desc) {
                updateTodoDescription(mode.todoId, desc);
                refresh();
              }
              backToBrowse();
            }}
            placeholder="Edit description…"
            focused
          />
        </box>
      )}

      {mode.name === 'addCategory' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[category]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => {
              const name = String(v).trim();
              if (name) {
                addCategory(name);
                refresh();
              }
              backToBrowse();
            }}
            placeholder="New category name…"
            focused
          />
        </box>
      )}

      {mode.name === 'moveTodo' && (
        <box marginTop={1} flexShrink={0} flexDirection="column">
          <text fg="gray">Move to category:</text>
          {categories.map((cat, i) => (
            <text key={cat.name} fg={i === mode.pick ? 'cyan' : 'gray'}>
              {i === mode.pick ? '▸ ' : '  '}{cat.name}
            </text>
          ))}
        </box>
      )}

      {mode.name === 'removeCategory' && (
        <box marginTop={1}>
          <text fg="yellow">Remove category '{mode.category}' and move its todos to default? [y/n]</text>
        </box>
      )}

      {mode.name === 'detail' && (() => {
        const todo = todos.find(t => t.id === mode.todoId);
        if (!todo) return null;
        return (
          <box marginTop={1} flexShrink={0} borderStyle="single" borderColor="cyan" padding={1} flexDirection="column">
            <text><b>{todo.description}</b></text>
            <text fg="gray">Category: {todo.category}</text>
            <text fg="gray">Status: {todo.status}</text>
            <text fg="gray">Created: {todo.created_at}</text>
            {todo.completed_at && <text fg="gray">Completed: {todo.completed_at}</text>}
          </box>
        );
      })()}

      {mode.name === 'browse' && (
        <>
          <ShortcutBar hints={[
            { key: '↑/↓', label: 'move' },
            { key: 'space', label: 'toggle' },
            { key: 'a', label: 'add' },
            { key: 'e', label: 'edit' },
            { key: 'enter', label: 'open' },
          ]} />
          <ShortcutBar hints={[
            { key: 'm', label: 'move' },
            { key: 'd', label: 'delete' },
            { key: 'c', label: 'category' },
            { key: 'esc', label: 'back' },
          ]} />
        </>
      )}
      {mode.name === 'addTodo' && <ShortcutBar hints={[{ key: 'enter', label: 'save' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'editTodo' && <ShortcutBar hints={[{ key: 'enter', label: 'save' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'addCategory' && <ShortcutBar hints={[{ key: 'enter', label: 'save' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'moveTodo' && <ShortcutBar hints={[{ key: '↑/↓', label: 'pick' }, { key: 'enter', label: 'move' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'removeCategory' && <ShortcutBar hints={[{ key: 'y', label: 'confirm' }, { key: 'n', label: 'cancel' }]} />}
      {mode.name === 'detail' && <ShortcutBar hints={[{ key: 'esc', label: 'close' }]} />}
    </box>
  );
}
