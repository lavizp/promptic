import { describe, it, expect } from "vitest";
import { parseNoteFile, serializeNote } from "./noteFile.ts";
import type { NoteMeta } from "../types/note.ts";

describe("parseNoteFile", () => {
  it("parses frontmatter including category", () => {
    const raw = [
      '---',
      'id: abc',
      'title: Hello',
      'category: journal',
      'created_at: 2026-01-01T00:00:00.000Z',
      'updated_at: 2026-01-02T00:00:00.000Z',
      '---',
      '',
      '# Body',
    ].join('\n');
    const note = parseNoteFile(raw, 'abc')!;
    expect(note.meta.title).toBe('Hello');
    expect(note.meta.category).toBe('journal');
    expect(note.content).toBe('# Body');
  });

  it("defaults category to 'default' when missing", () => {
    const raw = [
      '---',
      'id: abc',
      'title: Hi',
      'created_at: x',
      'updated_at: x',
      '---',
      '',
      'content',
    ].join('\n');
    expect(parseNoteFile(raw, 'abc')!.meta.category).toBe('default');
  });

  it("ignores a stray tags line (legacy files)", () => {
    const raw = [
      '---',
      'id: abc',
      'title: Hi',
      'tags: [old]',
      'created_at: x',
      'updated_at: x',
      '---',
      '',
      'content',
    ].join('\n');
    const note = parseNoteFile(raw, 'abc')!;
    expect(note.meta.title).toBe('Hi');
    expect(note.content).toBe('content');
  });

  it("returns undefined for content without frontmatter", () => {
    expect(parseNoteFile('just text', 'x')).toBeUndefined();
  });
});

describe("serializeNote", () => {
  it("round-trips meta and content", () => {
    const meta: NoteMeta = {
      id: 'abc',
      title: 'Hi',
      category: 'work',
      created_at: 'c',
      updated_at: 'u',
    };
    const raw = serializeNote(meta, '# body');
    const parsed = parseNoteFile(raw, 'abc')!;
    expect(parsed.meta).toEqual(meta);
    expect(parsed.content).toBe('# body');
  });
});
