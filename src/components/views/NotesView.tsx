import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { SyntaxStyle } from "@opentui/core";
import type { ScrollBoxRenderable, TextareaRenderable } from "@opentui/core";
import {
  addNoteCategory,
  createNote,
  deleteNote,
  getAllNotes,
  getNoteCategories,
  removeNoteCategory,
  updateNote,
} from "../../core/notesEngine.js";
import { getBacklinks } from "../../core/linkEngine.js";
import { buildRows } from "../../core/todoList.js";
import type { Note } from "../../types/note.js";
import type { Category } from "../../types/todo.js";
import { Tag } from "../shared/Tag.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

const DEFAULT_CATEGORY = 'default';
const syntaxStyle = SyntaxStyle.create();

type Mode =
  | { name: 'list' }
  | { name: 'add'; category: string }
  | { name: 'editTitle'; noteId: string }
  | { name: 'addCategory' }
  | { name: 'editContent'; noteId: string }
  | { name: 'move'; noteId: string; pick: number }
  | { name: 'removeCategory'; category: string };

interface NotesViewProps {
  onExit: () => void;
}

export function NotesView({ onExit }: NotesViewProps) {
  const [categories, setCategories] = useState<Category[]>(() => getNoteCategories());
  const [notes, setNotes] = useState<Note[]>([]);
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>({ name: 'list' });
  const [draft, setDraft] = useState('');
  const [editPane, setEditPane] = useState<'write' | 'preview'>('write');
  const [editorSnapshot, setEditorSnapshot] = useState('');
  const listRef = useRef<ScrollBoxRenderable>(null);
  const editorRef = useRef<TextareaRenderable>(null);

  const refresh = async () => {
    setCategories(getNoteCategories());
    setNotes(await getAllNotes());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const rows = buildRows(categories.map(c => c.name), notes, n => n.meta.category);
  const current = rows[cursor];

  useEffect(() => {
    if (cursor >= rows.length) {
      setCursor(Math.max(0, rows.length - 1));
    }
  }, [rows.length, cursor]);

  useEffect(() => {
    listRef.current?.scrollChildIntoView(`note-row-${cursor}`);
  }, [cursor]);

  // Put the cursor at the end of the note when entering the editor (or
  // toggling back from preview), so typing appends instead of prepending.
  useEffect(() => {
    if (mode.name === 'editContent' && editPane === 'write') {
      const editor = editorRef.current;
      if (editor) editor.cursorOffset = editor.plainText.length;
    }
  }, [mode.name, editPane]);

  const sel = (i: number) => (cursor === i ? { fg: 'black' as const, bg: 'cyan' as const } : {});

  const enterEditor = (noteId: string) => {
    const note = notes.find(n => n.meta.id === noteId);
    setEditorSnapshot(note?.content ?? '');
    setBacklinks(getBacklinks(noteId));
    setEditPane('write');
    setMode({ name: 'editContent', noteId });
  };

  const saveContent = async (noteId: string) => {
    const content = editorRef.current?.plainText ?? editorSnapshot;
    await updateNote(noteId, { content });
    await refresh();
    setMode({ name: 'list' });
  };

  useKeyboard((key) => {
    if (key.ctrl || key.meta) {
      if (key.ctrl && key.name === 's' && mode.name === 'editContent') {
        void saveContent(mode.noteId);
      }
      return;
    }

    switch (mode.name) {
      case 'add':
      case 'editTitle':
      case 'addCategory':
        if (key.name === 'escape') setMode({ name: 'list' });
        return;

      case 'editContent': {
        if (key.name === 'escape') {
          setMode({ name: 'list' });
        } else if (key.name === 'tab') {
          if (editPane === 'write') {
            setEditorSnapshot(editorRef.current?.plainText ?? editorSnapshot);
            setEditPane('preview');
          } else {
            setEditPane('write');
          }
        }
        return;
      }

      case 'move': {
        if (key.name === 'escape') {
          setMode({ name: 'list' });
        } else if (key.name === 'up' || key.name === 'k') {
          setMode(m => m.name === 'move' ? { ...m, pick: Math.max(0, m.pick - 1) } : m);
        } else if (key.name === 'down' || key.name === 'j') {
          setMode(m => m.name === 'move' ? { ...m, pick: Math.min(categories.length - 1, m.pick + 1) } : m);
        } else if (key.name === 'return') {
          const cat = categories[mode.pick];
          if (cat) {
            void updateNote(mode.noteId, { category: cat.name }).then(() => refresh());
          }
          setMode({ name: 'list' });
        }
        return;
      }

      case 'removeCategory': {
        if (key.name === 'y') {
          void removeNoteCategory(mode.category).then(() => refresh());
          setMode({ name: 'list' });
        } else if (key.name === 'n' || key.name === 'escape') {
          setMode({ name: 'list' });
        }
        return;
      }

      case 'list': {
        switch (key.name) {
          case 'up':
          case 'k':
            setCursor(i => Math.max(0, i - 1));
            break;
          case 'down':
          case 'j':
            setCursor(i => Math.min(rows.length - 1, i + 1));
            break;
          case 'a': {
            const target = current?.kind === 'category'
              ? current.name
              : current?.kind === 'item'
                ? current.item.meta.category
                : DEFAULT_CATEGORY;
            setDraft('');
            setMode({ name: 'add', category: target });
            break;
          }
          case 'e':
            if (current?.kind === 'item') {
              setDraft(current.item.meta.title);
              setMode({ name: 'editTitle', noteId: current.item.meta.id });
            }
            break;
          case 'return':
            if (current?.kind === 'item') enterEditor(current.item.meta.id);
            break;
          case 'm':
            if (current?.kind === 'item') setMode({ name: 'move', noteId: current.item.meta.id, pick: 0 });
            break;
          case 'd':
            if (current?.kind === 'item') {
              void deleteNote(current.item.meta.id).then(() => refresh());
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
      {mode.name === 'list' && (
        <scrollbox ref={listRef} scrollY flexGrow={1} padding={1}>
          {rows.length === 0 && <text fg="gray">No notes yet. Press a to create one.</text>}
          {rows.map((row, i) =>
            row.kind === 'category' ? (
              <box key={`cat-${row.name}`} id={`note-row-${i}`} marginTop={i === 0 ? 0 : 1}>
                <text {...sel(i)}>{cursor === i ? '▸ ' : '  '}{row.name.toUpperCase()} ({row.count})</text>
              </box>
            ) : (
              <box key={`note-${row.item.meta.id}`} id={`note-row-${i}`} marginLeft={1}>
                <text {...sel(i)}>{cursor === i ? '▸ ' : '  '}{row.item.meta.title}</text>
              </box>
            )
          )}
        </scrollbox>
      )}

      {mode.name === 'editContent' && (() => {
        const note = notes.find(n => n.meta.id === mode.noteId);
        if (!note) return null;
        if (editPane === 'preview') {
          return (
            <scrollbox scrollY flexGrow={1} padding={1}>
              <box flexDirection="row" gap={1} marginBottom={1}>
                {note.meta.tags.map(tag => (
                  <Tag key={tag} label={tag} />
                ))}
              </box>
              <text><b>{note.meta.title}</b></text>
              <markdown content={editorSnapshot} syntaxStyle={syntaxStyle} conceal />
              {backlinks.length > 0 && (
                <>
                  <text fg="gray">---</text>
                  <text><b>Linked Mentions</b></text>
                  {backlinks.map(link => (
                    <text key={link} fg="cyan">{link}</text>
                  ))}
                </>
              )}
            </scrollbox>
          );
        }
        return (
          <textarea
            ref={editorRef}
            initialValue={editorSnapshot}
            focused
            flexGrow={1}
            wrapMode="word"
          />
        );
      })()}

      {mode.name === 'add' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[{mode.category}]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => {
              const title = String(v).trim();
              void (async () => {
                if (title) {
                  const note = await createNote(title, mode.category);
                  await refresh();
                  if (note) enterEditor(note.meta.id);
                } else {
                  setMode({ name: 'list' });
                }
                setDraft('');
              })();
            }}
            placeholder="New note title…"
            focused
          />
        </box>
      )}

      {mode.name === 'editTitle' && (
        <box marginTop={1} flexDirection="row">
          <text fg="cyan">[title]</text>
          <input
            value={draft}
            onInput={(v) => setDraft(v)}
            onSubmit={(v) => {
              const title = String(v).trim();
              void (async () => {
                if (title) await updateNote(mode.noteId, { title });
                await refresh();
                setMode({ name: 'list' });
                setDraft('');
              })();
            }}
            placeholder="Edit title…"
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
              void (async () => {
                if (name) addNoteCategory(name);
                await refresh();
                setMode({ name: 'list' });
                setDraft('');
              })();
            }}
            placeholder="New category name…"
            focused
          />
        </box>
      )}

      {mode.name === 'move' && (
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
          <text fg="yellow">Remove category '{mode.category}' and move its notes to default? [y/n]</text>
        </box>
      )}

      {mode.name === 'list' && (
        <>
          <ShortcutBar hints={[
            { key: '↑/↓', label: 'move' },
            { key: 'a', label: 'add' },
            { key: 'e', label: 'title' },
            { key: 'enter', label: 'edit' },
            { key: 'm', label: 'move' },
          ]} />
          <ShortcutBar hints={[
            { key: 'd', label: 'delete' },
            { key: 'c', label: 'category' },
            { key: 'esc', label: 'back' },
          ]} />
        </>
      )}
      {mode.name === 'add' && <ShortcutBar hints={[{ key: 'enter', label: 'create' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'editTitle' && <ShortcutBar hints={[{ key: 'enter', label: 'save' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'addCategory' && <ShortcutBar hints={[{ key: 'enter', label: 'save' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'move' && <ShortcutBar hints={[{ key: '↑/↓', label: 'pick' }, { key: 'enter', label: 'move' }, { key: 'esc', label: 'cancel' }]} />}
      {mode.name === 'removeCategory' && <ShortcutBar hints={[{ key: 'y', label: 'confirm' }, { key: 'n', label: 'cancel' }]} />}
      {mode.name === 'editContent' && (editPane === 'write'
        ? <ShortcutBar hints={[{ key: 'tab', label: 'preview' }, { key: 'ctrl+s', label: 'save' }, { key: 'esc', label: 'cancel' }]} />
        : <ShortcutBar hints={[{ key: 'tab', label: 'edit' }, { key: 'ctrl+s', label: 'save' }, { key: 'esc', label: 'cancel' }]} />)}
    </box>
  );
}
