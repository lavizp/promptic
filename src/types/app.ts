import type { Todo } from './todo.js';

export type ViewType = 'feed' | 'todos' | 'notes' | 'reminders' | 'chat' | 'config';

export interface HistoryEntry {
  id: number;
  command: string;
  output: string;
  timestamp: string;
}

export interface AppState {
  currentView: ViewType;
  history: HistoryEntry[];
  activeTodoList: Todo[];
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
}
