import { useState, useCallback } from "react";
import type { AppState, ViewType, HistoryEntry } from "./types/app.js";
import type { Todo } from "./types/todo.js";
import { OutputPane } from "./components/layout/OutputPane.js";
import { InputPrompt } from "./components/layout/InputPrompt.js";
import { parseCommand } from "./controllers/commandParser.js";

const initialHistory: HistoryEntry[] = [];

export function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'feed',
    history: initialHistory,
    activeTodoList: [],
    chatStream: '',
    isProcessing: false,
    error: null,
    provider: 'openai',
  });

  const handleCommand = useCallback((input: string) => {
    parseCommand(input, state, setState);
  }, [state]);

  const exitToFeed = useCallback(() => {
    setState(s => ({ ...s, currentView: 'feed', error: null }));
  }, []);

  // Non-feed views are keyboard-driven: each view owns its keys (arrows,
  // shortcuts, Esc to return to feed). Only the feed keeps the command bar
  // focused, so the two never fight over keystrokes.
  const commandBarFocused = state.currentView === 'feed';

  return (
    <box flexDirection="column" height="100%" width="100%">
      <box flexGrow={1} overflow="hidden">
        <OutputPane
          currentView={state.currentView}
          history={state.history}
          activeTodoList={state.activeTodoList}
          chatStream={state.chatStream}
          isProcessing={state.isProcessing}
          error={state.error}
          provider={state.provider}
          onExit={exitToFeed}
        />
      </box>
      <box height={3} borderStyle="single" borderColor="gray">
        <InputPrompt onSubmit={handleCommand} isProcessing={state.isProcessing} focused={commandBarFocused} />
      </box>
    </box>
  );
}
