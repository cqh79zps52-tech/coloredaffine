/**
 * MiniEditor — a tiny block-based text editor purpose-built for the
 * calendar grid.
 *
 * Why this exists: dropping a real BlockSuiteEditor into every calendar
 * cell was both heavy (each editor pulls in the full block schema,
 * services, and DOM machinery) and fragile (BlockSuite assumes a
 * single live editor on the page and crashes when many race over its
 * globals). The calendar only needs three things:
 *
 *   1. multi-line plain text
 *   2. checkbox todos
 *   3. one heading level
 *
 * So we hand-roll those three block types as a list of `<input>`s and
 * skip everything else. Every cell can be edited at the same time
 * because there are no shared globals. Persistence happens via the
 * parent component (see `use-calendar-docs.ts`).
 *
 * Keyboard model:
 *
 *   - Enter:           split the current block at the caret. A new
 *                      paragraph follows a paragraph; a new (unchecked)
 *                      todo follows a todo. Headings always break into
 *                      a paragraph because that's almost always what
 *                      you want.
 *   - Backspace at 0:  if the block is non-paragraph, demote it to a
 *                      paragraph first; otherwise merge into the block
 *                      above and put the caret at the join point.
 *   - ArrowUp / Down:  vertical caret motion across blocks.
 *   - Type `[] ` or
 *     `[ ] ` at the
 *     start of a
 *     paragraph:        convert it to a todo.
 *   - Type `[x] `:      convert it to a checked todo.
 *   - Type `# `:        convert it to a heading.
 */
import clsx from 'clsx';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import * as styles from './styles.css';
import type { MiniBlock } from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyParagraph(): MiniBlock {
  return { id: uid(), type: 'p', text: '' };
}

interface MiniEditorProps {
  value: MiniBlock[];
  onChange: (next: MiniBlock[]) => void;
  placeholder?: string;
}

export const MiniEditor = ({
  value,
  onChange,
  placeholder,
}: MiniEditorProps) => {
  // Always render at least one block so the user has something to
  // click into. We never persist a lone empty paragraph (the storage
  // layer trims those out), but the in-memory render needs one. The
  // useMemo is mandatory: without it, the fallback expression returns
  // a fresh array on every render, which would re-trigger every effect
  // and useCallback below.
  const blocks = useMemo<MiniBlock[]>(
    () => (value.length === 0 ? [emptyParagraph()] : value),
    [value]
  );

  const inputsRef = useRef<Map<string, HTMLInputElement | null>>(new Map());

  // After updates that add/remove/merge blocks we want to place the
  // caret on a specific block at a specific offset. We can't do that
  // synchronously because the new <input> may not exist yet, so we
  // queue it and run it in a layout effect after the next render.
  const pendingFocusRef = useRef<{ id: string; pos: number } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const el = inputsRef.current.get(pending.id);
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(pending.pos, pending.pos);
      } catch {
        // Some input types don't support setSelectionRange — fine.
      }
    }
    pendingFocusRef.current = null;
  });

  // Stale entries pile up in inputsRef as blocks are deleted; clean
  // them out so the map doesn't leak forever in long sessions.
  useEffect(() => {
    const live = new Set(blocks.map(b => b.id));
    for (const key of inputsRef.current.keys()) {
      if (!live.has(key)) inputsRef.current.delete(key);
    }
  }, [blocks]);

  const focusBlock = useCallback((id: string, pos: number) => {
    const el = inputsRef.current.get(id);
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* noop */
    }
  }, []);

  const handleTextChange = useCallback(
    (idx: number, raw: string) => {
      const block = blocks[idx];
      const next = blocks.slice();

      // Inline conversions: only fire when the user has just typed the
      // shortcut at the start of an empty (or about-to-be-empty) block.
      if (block.type === 'p') {
        if (raw === '[] ' || raw === '[ ] ') {
          next[idx] = { ...block, type: 'todo', text: '', done: false };
          onChange(next);
          return;
        }
        if (raw === '[x] ' || raw === '[X] ') {
          next[idx] = { ...block, type: 'todo', text: '', done: true };
          onChange(next);
          return;
        }
        if (raw === '# ') {
          next[idx] = { ...block, type: 'h1', text: '' };
          onChange(next);
          return;
        }
      }

      next[idx] = { ...block, text: raw };
      onChange(next);
    },
    [blocks, onChange]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
      const block = blocks[idx];
      const input = e.currentTarget;
      const caret = input.selectionStart ?? 0;
      const caretEnd = input.selectionEnd ?? caret;

      if (e.key === 'Enter') {
        e.preventDefault();
        const before = block.text.slice(0, caret);
        const after = block.text.slice(caretEnd);
        const newBlock: MiniBlock =
          block.type === 'todo'
            ? { id: uid(), type: 'todo', text: after, done: false }
            : { id: uid(), type: 'p', text: after };
        const next = blocks.slice();
        next[idx] = { ...block, text: before };
        next.splice(idx + 1, 0, newBlock);
        pendingFocusRef.current = { id: newBlock.id, pos: 0 };
        onChange(next);
        return;
      }

      if (e.key === 'Backspace' && caret === 0 && caretEnd === 0) {
        if (block.type !== 'p') {
          e.preventDefault();
          const next = blocks.slice();
          next[idx] = { id: block.id, type: 'p', text: block.text };
          onChange(next);
          return;
        }
        if (idx === 0) return;
        e.preventDefault();
        const prev = blocks[idx - 1];
        const joinAt = prev.text.length;
        const next = blocks.slice();
        next[idx - 1] = { ...prev, text: prev.text + block.text };
        next.splice(idx, 1);
        pendingFocusRef.current = { id: prev.id, pos: joinAt };
        onChange(next);
        return;
      }

      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        const prev = blocks[idx - 1];
        focusBlock(prev.id, Math.min(caret, prev.text.length));
        return;
      }

      if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
        e.preventDefault();
        const nx = blocks[idx + 1];
        focusBlock(nx.id, Math.min(caret, nx.text.length));
        return;
      }
    },
    [blocks, focusBlock, onChange]
  );

  const toggleTodo = useCallback(
    (idx: number) => {
      const block = blocks[idx];
      if (block.type !== 'todo') return;
      const next = blocks.slice();
      next[idx] = { ...block, done: !block.done };
      onChange(next);
    },
    [blocks, onChange]
  );

  return (
    <div className={styles.miniEditor}>
      {blocks.map((b, i) => {
        const isFirst = i === 0;
        const showPlaceholder = isFirst && b.type === 'p' && b.text === '';
        return (
          <div
            key={b.id}
            className={clsx(
              styles.miniRow,
              b.type === 'todo' && styles.miniRowTodo,
              b.type === 'h1' && styles.miniRowH1
            )}
          >
            {b.type === 'todo' && (
              <input
                type="checkbox"
                className={styles.miniCheckbox}
                checked={!!b.done}
                onChange={() => toggleTodo(i)}
                tabIndex={-1}
              />
            )}
            <input
              ref={el => {
                inputsRef.current.set(b.id, el);
              }}
              className={clsx(
                styles.miniInput,
                b.type === 'h1' && styles.miniInputH1,
                b.type === 'todo' && b.done && styles.miniInputDone
              )}
              value={b.text}
              placeholder={showPlaceholder ? placeholder : undefined}
              onChange={e => handleTextChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        );
      })}
    </div>
  );
};
