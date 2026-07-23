import { getAllTodos, getTodosByCategory } from "../../core/todoEngine.js";
import type { TodoCategory } from "../../types/todo.js";

export function TodoView() {
  const grouped = getTodosByCategory();
  const categories: TodoCategory[] = ['work', 'fitness', 'personal'];
  const daily = categories.map(cat => grouped[cat].filter(t => t.type === 'daily'));
  const backlog = getAllTodos().filter(t => t.type === 'backlog');

  return (
    <box flexDirection="row" padding={1}>
      <box flexGrow={1} flexDirection="column">
        <b>Daily Tasks</b>
        {categories.map(cat => (
          <box key={cat} marginTop={1}>
            <text fg="yellow">{cat.toUpperCase()}</text>
            {grouped[cat].filter(t => t.type === 'daily').length === 0 && (
              <text fg="gray">  No tasks</text>
            )}
            {grouped[cat].filter(t => t.type === 'daily').map(todo => (
              <box key={todo.id} marginLeft={1}>
                <text>{todo.status === 'completed' ? '☑' : '☐'} {todo.description}</text>
              </box>
            ))}
          </box>
        ))}
      </box>
      <box flexGrow={1} flexDirection="column" marginLeft={2}>
        <b>Backlog</b>
        {backlog.length === 0 && <text fg="gray">  No backlog tasks</text>}
        {backlog.map(todo => (
          <box key={todo.id}>
            <text fg="gray">{todo.description}</text>
          </box>
        ))}
      </box>
    </box>
  );
}
