import type { ViewType, HistoryEntry } from "../../types/app.js";
import type { Todo } from "../../types/todo.js";
import { FeedView } from "../views/FeedView.js";
import { TodoView } from "../views/TodoView.js";
import { NotesView } from "../views/NotesView.js";
import { RemindersView } from "../views/RemindersView.js";
import { ChatView } from "../views/ChatView.js";
import { ConfigView } from "../views/ConfigView.js";

interface OutputPaneProps {
  currentView: ViewType;
  history: HistoryEntry[];
  activeTodoList: Todo[];
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
  onExit: () => void;
}

export function OutputPane(props: OutputPaneProps) {
  const { currentView } = props;

  // Errors are rendered *inside* the feed rather than replacing the whole pane.
  // Every view except the feed owns its own keyboard (App.tsx focuses the
  // command bar only on the feed), so a full-pane error box left the user with
  // no focused input and no key handler — stuck until Ctrl+C.
  switch (currentView) {
    case 'todos':
      return <TodoView onExit={props.onExit} />;
    case 'notes':
      return <NotesView onExit={props.onExit} />;
    case 'reminders':
      return <RemindersView onExit={props.onExit} />;
    case 'chat':
      return <ChatView stream={props.chatStream} isProcessing={props.isProcessing} onExit={props.onExit} />;
    case 'config':
      return <ConfigView onExit={props.onExit} />;
    case 'feed':
    default:
      return <FeedView history={props.history} error={props.error} />;
  }
}
