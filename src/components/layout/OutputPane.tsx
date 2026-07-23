import type { ViewType, HistoryEntry } from "../../types/app.js";
import type { Todo } from "../../types/todo.js";
import type { Note } from "../../types/note.js";
import { FeedView } from "../views/FeedView.js";
import { TodoView } from "../views/TodoView.js";
import { NoteView } from "../views/NoteView.js";
import { ChatView } from "../views/ChatView.js";
import { ConfigView } from "../views/ConfigView.js";
import { ErrorBox } from "../shared/ErrorBox.js";

interface OutputPaneProps {
  currentView: ViewType;
  history: HistoryEntry[];
  activeTodoList: Todo[];
  activeNote: Note | null;
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
}

export function OutputPane(props: OutputPaneProps) {
  const { currentView, error } = props;

  if (error) {
    return <ErrorBox message={error} />;
  }

  switch (currentView) {
    case 'todos':
      return <TodoView />;
    case 'note':
      return props.activeNote ? <NoteView note={props.activeNote} /> : <FeedView history={props.history} />;
    case 'chat':
      return <ChatView stream={props.chatStream} isProcessing={props.isProcessing} />;
    case 'config':
      return <ConfigView />;
    case 'feed':
    default:
      return <FeedView history={props.history} />;
  }
}
