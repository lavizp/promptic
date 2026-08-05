import type { ViewType, HistoryEntry } from "../../types/app.js";
import type { Todo } from "../../types/todo.js";
import { FeedView } from "../views/FeedView.js";
import { TodoView } from "../views/TodoView.js";
import { NotesView } from "../views/NotesView.js";
import { ChatView } from "../views/ChatView.js";
import { ConfigView } from "../views/ConfigView.js";
import { ErrorBox } from "../shared/ErrorBox.js";

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
  const { currentView, error } = props;

  if (error) {
    return <ErrorBox message={error} />;
  }

  switch (currentView) {
    case 'todos':
      return <TodoView onExit={props.onExit} />;
    case 'notes':
      return <NotesView onExit={props.onExit} />;
    case 'chat':
      return <ChatView stream={props.chatStream} isProcessing={props.isProcessing} onExit={props.onExit} />;
    case 'config':
      return <ConfigView onExit={props.onExit} />;
    case 'feed':
    default:
      return <FeedView history={props.history} />;
  }
}
