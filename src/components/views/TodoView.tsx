import { useEffect, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { addTodo, getAllTodos, toggleTodo } from "../../core/todoEngine.js";
import { flattenTodos } from "../../core/todoList.js";
import type { Todo, TodoCategory } from "../../types/todo.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

const CATEGORIES: TodoCategory[] = ['work', 'fitness', 'personal'];

type Mode = 'browse' | 'add';

interface TodoViewProps {
  onExit: () => void;
}

export function TodoView({ onExit }: TodoViewProps) {
  const [todos, setTodos] = useState<Todo[]>(() => getAllTodos());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<TodoCategory>('work');

  const refresh = () => setTodos(getAllTodos());

  const flat = flattenTodos(todos);
  const selectedId = flat[selectedIndex]?.id;

  useEffect(() => {
    if (selectedIndex >= flat.length) {
      setSelectedIndex(Math.max(0, flat.length - 1));
    }
  }, [flat.length, selectedIndex]);

  const handleAdd = (value: string) => {
    const desc = value.trim();
    if (!desc) return;
    addTodo(desc, category);
    setDraft('');
    setMode('browse');
    refresh();
  };

  useKeyboard((key) => {
    if (mode === 'add') {
      if (key.name === 'escape') {
        setDraft('');
        setMode('browse');
      } else if (key.name === 'tab') {
        setCategory(c => CATEGORIES[(CATEGORIES.indexOf(c) + 1) % CATEGORIES.length]!);
      }
      return;
    }

    switch (key.name) {
      case 'up':
      case 'k':
        setSelectedIndex(i => Math.max(0, i - 1));
        break;
      case 'down':
      case 'j':
        setSelectedIndex(i => (flat.length === 0 ? 0 : Math.min(flat.length - 1, i + 1)));
        break;
      case 'space':
      case 'x':
        if (selectedId != null) {
          toggleTodo(selectedId);
          refresh();
        }
        break;
      case 'a':
        setDraft('');
        setCategory('work');
        setMode('add');
        break;
      case 'escape':
        onExit();
        break;
    }
  });

  const grouped: Record<TodoCategory, Todo[]> = { work: [], fitness: [], personal: [] };
  for (const t of todos) grouped[t.category].push(t);
  const backlog = todos.filter(t => t.type === 'backlog');

  const dailyRow = (todo: Todo) => {
    if (todo.id === selectedId) {
      return <text fg="black" bg="cyan">▸ {todo.status === 'completed' ? '☑' : '☐'} {todo.description}</text>;
    }
    return <text>  {todo.status === 'completed' ? '☑' : '☐'} {todo.description}</text>;
  };

  const backlogRow = (todo: Todo) => {
    if (todo.id === selectedId) {
      return <text fg="black" bg="cyan">▸ {todo.description}</text>;
    }
    return <text fg="gray">  {todo.description}</text>;
  };

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box flexGrow={1} flexDirection="row">
        <box flexGrow={1} flexDirection="column">
          <text><b>Daily Tasks</b></text>
          {CATEGORIES.map(cat => (
            <box key={cat} marginTop={1}>
              <text fg="yellow">{cat.toUpperCase()}</text>
              {grouped[cat].filter(t => t.type === 'daily').length === 0 && (
                <text fg="gray">  No tasks</text>
              )}
              {grouped[cat].filter(t => t.type === 'daily').map(todo => (
                <box key={todo.id} marginLeft={1}>{dailyRow(todo)}</box>
              ))}
            </box>
          ))}
        </box>
        <box flexGrow={1} flexDirection="column" marginLeft={2}>
          <text><b>Backlog</b></text>
          {backlog.length === 0 && <text fg="gray">  No backlog tasks</text>}
          {backlog.map(todo => (
            <box key={todo.id}>{backlogRow(todo)}</box>
          ))}
        </box>
      </box>

      {mode === 'add' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[{category}]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => handleAdd(String(v))}
            placeholder="New todo description…"
            focused
          />
        </box>
      )}

      <ShortcutBar
        hints={mode === 'add'
          ? [
              { key: 'tab', label: 'category' },
              { key: 'enter', label: 'save' },
              { key: 'esc', label: 'cancel' },
            ]
          : [
              { key: '↑/↓', label: 'move' },
              { key: 'space', label: 'toggle' },
              { key: 'a', label: 'add' },
              { key: 'esc', label: 'back' },
            ]}
      />
    </box>
  );
}
