import type { Note } from "../../types/note.js";
import { Tag } from "../shared/Tag.js";

interface NoteViewProps {
  note: Note;
}

export function NoteView({ note }: NoteViewProps) {
  return (
    <scrollbox scrollY padding={1}>
      <box flexDirection="row" gap={1} marginBottom={1}>
        {note.meta.tags.map(tag => (
          <Tag key={tag} label={tag} />
        ))}
      </box>
      <b>{note.meta.title}</b>
      <text>{note.content}</text>
      {note.backlinks.length > 0 && (
        <>
          <text fg="gray">---</text>
          <b>Linked Mentions</b>
          {note.backlinks.map(link => (
            <text key={link} fg="cyan">{link}</text>
          ))}
        </>
      )}
    </scrollbox>
  );
}
