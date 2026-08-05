import { useKeyboard } from "@opentui/react";
import type { Note } from "../../types/note.js";
import { Tag } from "../shared/Tag.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

interface NoteViewProps {
  note: Note;
  onExit: () => void;
}

export function NoteView({ note, onExit }: NoteViewProps) {
  useKeyboard((key) => {
    if (key.name === 'escape') onExit();
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox scrollY padding={1} flexGrow={1}>
        <box flexDirection="row" gap={1} marginBottom={1}>
          {note.meta.tags.map(tag => (
            <Tag key={tag} label={tag} />
          ))}
        </box>
        <text><b>{note.meta.title}</b></text>
        <text>{note.content}</text>
        {note.backlinks.length > 0 && (
          <>
            <text fg="gray">---</text>
            <text><b>Linked Mentions</b></text>
            {note.backlinks.map(link => (
              <text key={link} fg="cyan">{link}</text>
            ))}
          </>
        )}
      </scrollbox>
      <ShortcutBar
        hints={[
          { key: 'esc', label: 'back' },
          { key: '/tag', label: 'add tag' },
          { key: '/link', label: 'link note' },
        ]}
      />
    </box>
  );
}
