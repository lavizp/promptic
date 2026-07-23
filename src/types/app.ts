import type { Todo } from './todo.js';
import type { Note } from './note.js';

export type ViewType = 'feed' | 'todos' | 'note' | 'chat' | 'config';

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
  activeNote: Note | null;
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
}
