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
 *   - Type `/`:         opens the slash command menu (see SLASH_COMMANDS
 *                      below). The menu filters as you type, ArrowUp /
 *                      ArrowDown navigates, Enter applies, Escape
 *                      closes. Selecting a command replaces the current
 *                      block's type and clears its text.
 */
import clsx from 'clsx';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import * as styles from './styles.css';
import type { MiniBlock, MiniBlockType } from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyParagraph(): MiniBlock {
  return { id: uid(), type: 'p', text: '' };
}

/**
 * One slash-command entry. Commands come in two shapes:
 *
 *   - Transform commands set `apply` and replace the *current* block
 *     with a new shape, preserving the block id so the textarea
 *     stays mounted and the caret can be re-focused.
 *   - Whole-day commands set `clearAll: true` and operate on the
 *     entire block list (currently only `/clear-case-content`, which
 *     wipes every block in the day cell).
 */
interface SlashCommand {
  id: string;
  label: string;
  desc: string;
  /** Substrings that should also match this command from the query. */
  keywords: string[];
  apply?: () => { type: MiniBlockType; text: string; done?: boolean };
  /** When true, applyCommand wipes every block in the day cell. */
  clearAll?: boolean;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'text',
    label: 'Text',
    desc: 'Plain paragraph',
    keywords: ['paragraph', 'plain', 'p'],
    apply: () => ({ type: 'p', text: '' }),
  },
  {
    id: 'todo',
    label: 'To-do',
    desc: 'Checkbox item',
    keywords: ['task', 'check', 'checkbox'],
    apply: () => ({ type: 'todo', text: '', done: false }),
  },
  {
    id: 'done',
    label: 'Done to-do',
    desc: 'Checked checkbox item',
    keywords: ['checked', 'task'],
    apply: () => ({ type: 'todo', text: '', done: true }),
  },
  {
    id: 'h1',
    label: 'Heading',
    desc: 'Big title for the day',
    keywords: ['title', 'header', 'h1'],
    apply: () => ({ type: 'h1', text: '' }),
  },
  {
    id: 'clear-case-content',
    label: 'Clear day',
    desc: 'Erase everything written in this day cell',
    keywords: ['clear', 'wipe', 'reset', 'erase', 'delete', 'empty'],
    clearAll: true,
  },
];

interface SlashState {
  blockId: string;
  query: string;
  /** Viewport-relative coords of the input bottom-left corner. */
  anchor: { top: number; left: number };
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
  // Stable "empty placeholder" block. We use this whenever the day
  // has no persisted blocks, and crucially the same id every time —
  // see the long comment in the non-empty→empty effect below for why.
  // useState's lazy initializer runs exactly once per editor instance,
  // which gives us a non-nullable stable value without a ref dance.
  const [fallbackBlock] = useState<MiniBlock>(() => emptyParagraph());

  // Always render at least one block so the user has something to
  // click into. We never persist a lone empty paragraph (the storage
  // layer trims those out), but the in-memory render needs one. The
  // useMemo is mandatory: without it, the fallback expression returns
  // a fresh array on every render, which would re-trigger every effect
  // and useCallback below.
  const blocks = useMemo<MiniBlock[]>(
    () => (value.length === 0 ? [fallbackBlock] : value),
    [value, fallbackBlock]
  );

  const inputsRef = useRef<Map<string, HTMLTextAreaElement | null>>(new Map());

  // After updates that add/remove/merge blocks we want to place the
  // caret on a specific block at a specific offset. We can't do that
  // synchronously because the new <textarea> may not exist yet, so we
  // queue it and run it in a layout effect after the next render.
  const pendingFocusRef = useRef<{ id: string; pos: number } | null>(null);

  // Did the last render's onChange come from this editor? We use this
  // flag to decide whether to refocus on a non-empty→empty transition,
  // so external resets (e.g. another tab clearing the day) don't
  // hijack focus.
  const selfEmitRef = useRef(false);
  const prevValueLenRef = useRef(value.length);

  // Slash command popup state. `null` means the menu is closed.
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    if (!slashState) return [];
    const q = slashState.query.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(cmd => {
      if (cmd.id.includes(q)) return true;
      if (cmd.label.toLowerCase().includes(q)) return true;
      return cmd.keywords.some(k => k.includes(q));
    });
  }, [slashState]);

  // Reset the highlighted item whenever the query changes — without
  // this you can end up with an out-of-bounds index after filtering
  // narrows the list.
  useEffect(() => {
    setSlashIndex(0);
  }, [slashState?.query]);

  /**
   * Emits a new block list, marking the change as originating from
   * this editor instance. The marker is consumed in the
   * non-empty→empty layout effect below to know whether to refocus.
   */
  const emit = useCallback(
    (next: MiniBlock[]) => {
      selfEmitRef.current = true;
      onChange(next);
    },
    [onChange]
  );

  // Non-empty → empty transition. Why this exists: when the user
  // backspaces away the last character of the only block, the storage
  // layer trims the (now empty) paragraph out and stores nothing,
  // which means `value` arrives back as `[]`. We then swap to the
  // fallback block, which has a different React key than the original
  // — so React unmounts the old <textarea> and mounts a new one,
  // killing focus mid-typing. Solution: detect that exact transition
  // and queue a focus on the fallback block id so the user can keep
  // typing seamlessly.
  useLayoutEffect(() => {
    if (
      selfEmitRef.current &&
      prevValueLenRef.current > 0 &&
      value.length === 0
    ) {
      pendingFocusRef.current = {
        id: fallbackBlock.id,
        pos: 0,
      };
    }
    selfEmitRef.current = false;
    prevValueLenRef.current = value.length;
  }, [value, fallbackBlock]);

  // Auto-size every textarea to fit its content. Runs after each
  // render so newly mounted textareas and edited ones are both
  // correct on the same frame.
  useLayoutEffect(() => {
    for (const b of blocks) {
      const el = inputsRef.current.get(b.id);
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [blocks]);

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
    // If the block hosting the slash menu was just deleted, close the
    // menu rather than leaving it pinned to a vanished input.
    if (slashState && !live.has(slashState.blockId)) {
      setSlashState(null);
    }
  }, [blocks, slashState]);

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

  /** Computes viewport coords for the slash menu anchored under `id`. */
  const computeAnchor = useCallback((id: string) => {
    const el = inputsRef.current.get(id);
    if (!el) return { top: 0, left: 0 };
    const r = el.getBoundingClientRect();
    return { top: r.bottom + 4, left: r.left };
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
          setSlashState(null);
          emit(next);
          return;
        }
        if (raw === '[x] ' || raw === '[X] ') {
          next[idx] = { ...block, type: 'todo', text: '', done: true };
          setSlashState(null);
          emit(next);
          return;
        }
        if (raw === '# ') {
          next[idx] = { ...block, type: 'h1', text: '' };
          setSlashState(null);
          emit(next);
          return;
        }
      }

      // Slash menu: a `/` at position 0 opens the popup. We still let
      // the text update normally so the user sees what they typed; the
      // popup just sits on top until they pick a command or dismiss.
      if (raw.startsWith('/')) {
        setSlashState({
          blockId: block.id,
          query: raw.slice(1),
          anchor: computeAnchor(block.id),
        });
      } else if (slashState && slashState.blockId === block.id) {
        setSlashState(null);
      }

      next[idx] = { ...block, text: raw };
      emit(next);
    },
    [blocks, emit, slashState, computeAnchor]
  );

  const applyCommand = useCallback(
    (cmd: SlashCommand) => {
      if (!slashState) return;

      // Whole-day "clear" branch — wipes every block in the cell.
      // We emit an empty array; the storage layer treats that as
      // "no content" and the editor's blocks memo falls back to a
      // single empty paragraph so the textarea stays mountable.
      if (cmd.clearAll) {
        pendingFocusRef.current = { id: fallbackBlock.id, pos: 0 };
        setSlashState(null);
        emit([]);
        return;
      }

      const idx = blocks.findIndex(b => b.id === slashState.blockId);
      if (idx === -1) {
        setSlashState(null);
        return;
      }
      const block = blocks[idx];
      if (!cmd.apply) {
        // Non-transform command without a clearAll handler — nothing
        // to do, just close the menu.
        setSlashState(null);
        return;
      }
      const shape = cmd.apply();
      const next = blocks.slice();
      next[idx] = {
        id: block.id,
        type: shape.type,
        text: shape.text,
        done: shape.done,
      };
      pendingFocusRef.current = { id: block.id, pos: 0 };
      setSlashState(null);
      emit(next);
    },
    [blocks, slashState, emit, fallbackBlock]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      const block = blocks[idx];
      const input = e.currentTarget;
      const caret = input.selectionStart ?? 0;
      const caretEnd = input.selectionEnd ?? caret;
      // ALWAYS read the live text from the DOM, not from `block.text`.
      // The React closure can lag one keystroke behind the textarea
      // when typing quickly, which made Enter split on stale text and
      // appear to "eat" the most recent character.
      const currentText = input.value;

      // Slash menu navigation takes priority over normal editor keys
      // when the menu is open and pinned to this block.
      if (
        slashState &&
        slashState.blockId === block.id &&
        filteredCommands.length > 0
      ) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashIndex(i => (i + 1) % filteredCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashIndex(
            i => (i - 1 + filteredCommands.length) % filteredCommands.length
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const cmd = filteredCommands[slashIndex] ?? filteredCommands[0];
          applyCommand(cmd);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setSlashState(null);
          return;
        }
      }

      if (e.key === 'Enter') {
        // Always intercept Enter — we never want a literal newline
        // inside a single block, since wrapping happens via the
        // textarea itself. Enter creates a fresh block instead.
        e.preventDefault();

        // Empty list-item / heading + Enter → exit the list. This is
        // the universal "drop me out of the list" gesture that every
        // note editor implements; without it, users get stuck in todo
        // mode with no obvious way back to a plain paragraph.
        if (
          (block.type === 'todo' || block.type === 'h1') &&
          currentText === ''
        ) {
          const next = blocks.slice();
          next[idx] = { id: block.id, type: 'p', text: '' };
          pendingFocusRef.current = { id: block.id, pos: 0 };
          emit(next);
          return;
        }

        const before = currentText.slice(0, caret);
        const after = currentText.slice(caretEnd);
        const newBlock: MiniBlock =
          block.type === 'todo'
            ? { id: uid(), type: 'todo', text: after, done: false }
            : { id: uid(), type: 'p', text: after };
        const next = blocks.slice();
        next[idx] = { ...block, text: before };
        next.splice(idx + 1, 0, newBlock);
        pendingFocusRef.current = { id: newBlock.id, pos: 0 };
        emit(next);
        return;
      }

      if (e.key === 'Backspace' && caret === 0 && caretEnd === 0) {
        if (block.type !== 'p') {
          // Demote to a plain paragraph but keep whatever the user
          // had typed so far. Use the live DOM value, not the closure.
          e.preventDefault();
          const next = blocks.slice();
          next[idx] = { id: block.id, type: 'p', text: currentText };
          pendingFocusRef.current = { id: block.id, pos: 0 };
          emit(next);
          return;
        }
        if (idx === 0) return;
        e.preventDefault();
        const prev = blocks[idx - 1];
        // Read prev's live text from its textarea if we have one;
        // closure value is fine if not.
        const prevEl = inputsRef.current.get(prev.id);
        const prevText = prevEl ? prevEl.value : prev.text;
        const joinAt = prevText.length;
        const next = blocks.slice();
        next[idx - 1] = { ...prev, text: prevText + currentText };
        next.splice(idx, 1);
        pendingFocusRef.current = { id: prev.id, pos: joinAt };
        emit(next);
        return;
      }

      // ArrowUp/Down only jump across blocks when the caret is on
      // the very edge of the current textarea — otherwise let the
      // default behaviour move the caret within the wrapped lines of
      // the same block.
      if (e.key === 'ArrowUp' && idx > 0 && caret === 0 && caretEnd === 0) {
        e.preventDefault();
        const prev = blocks[idx - 1];
        focusBlock(prev.id, prev.text.length);
        return;
      }

      if (
        e.key === 'ArrowDown' &&
        idx < blocks.length - 1 &&
        caret === currentText.length &&
        caretEnd === currentText.length
      ) {
        e.preventDefault();
        const nx = blocks[idx + 1];
        focusBlock(nx.id, 0);
        return;
      }
    },
    [
      blocks,
      focusBlock,
      emit,
      slashState,
      filteredCommands,
      slashIndex,
      applyCommand,
    ]
  );

  const toggleTodo = useCallback(
    (idx: number) => {
      const block = blocks[idx];
      if (block.type !== 'todo') return;
      const next = blocks.slice();
      next[idx] = { ...block, done: !block.done };
      emit(next);
    },
    [blocks, emit]
  );

  /**
   * Recompute slash menu state from a textarea's current text + caret
   * position. Used by onSelect on every textarea so the menu opens
   * not just when the user *types* `/` but also when they click /
   * arrow-key into a block whose text already starts with `/`. We
   * keep the rule simple: the menu shows iff the block's text
   * starts with `/` and the caret has moved past that first
   * character. The query is everything after the leading slash.
   */
  const syncSlashFromCaret = useCallback(
    (block: MiniBlock, input: HTMLTextAreaElement, currentText: string) => {
      const caret = input.selectionStart ?? 0;
      const opensSlash = currentText.startsWith('/') && caret >= 1;
      if (opensSlash) {
        const nextQuery = currentText.slice(1);
        // Only setState when something actually changed, otherwise
        // we re-create slashState on every selectionchange and
        // thrash the dismiss-listener useEffect.
        if (
          !slashState ||
          slashState.blockId !== block.id ||
          slashState.query !== nextQuery
        ) {
          setSlashState({
            blockId: block.id,
            query: nextQuery,
            anchor: computeAnchor(block.id),
          });
        }
      } else if (slashState && slashState.blockId === block.id) {
        setSlashState(null);
      }
    },
    [slashState, computeAnchor]
  );

  const handleSelect = useCallback(
    (idx: number, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const block = blocks[idx];
      const input = e.currentTarget;
      syncSlashFromCaret(block, input, input.value);
    },
    [blocks, syncSlashFromCaret]
  );

  // Slash menu dismiss: a document-level pointerdown listener that
  // closes the menu when the click lands outside the editor root or
  // the menu itself. Both refs are real DOM nodes — Node.contains()
  // is a pure tree query, so the slash menu works even though it's
  // rendered through a portal. We also dismiss on Escape.
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slashState) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (editorRootRef.current?.contains(target)) return;
      if (slashMenuRef.current?.contains(target)) return;
      setSlashState(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlashState(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [slashState]);

  return (
    <div className={styles.miniEditor} data-mini-editor="1" ref={editorRootRef}>
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
            <textarea
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
              onSelect={e => handleSelect(i, e)}
              spellCheck={false}
              autoComplete="off"
              rows={1}
              wrap="soft"
            />
          </div>
        );
      })}

      {slashState &&
        filteredCommands.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.slashMenu}
            ref={slashMenuRef}
            // Anchor coords are viewport-relative, so position: fixed
            // sidesteps any ancestor `overflow: hidden` clipping.
            style={{ top: slashState.anchor.top, left: slashState.anchor.left }}
            role="listbox"
          >
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                data-mini-slash="1"
                role="option"
                aria-selected={i === slashIndex}
                className={clsx(
                  styles.slashItem,
                  i === slashIndex && styles.slashItemActive
                )}
                // History of this handler — read this before changing
                // anything:
                //
                // 1. Started with applyCommand inside onMouseDown.
                //    Synchronously cleared slashState and tore the
                //    portal down between mousedown and click, so
                //    onClick never ran on desktop.
                // 2. Split into onMouseDown→preventDefault +
                //    onPointerDown→preventDefault + onClick. That
                //    worked on desktop but the pointerdown
                //    preventDefault suppressed the synthesised click
                //    on touch, so taps did nothing on mobile.
                // 3. Dropped the pointerdown preventDefault — desktop
                //    still worked, but the user reported click is
                //    STILL not firing on the deployed mobile build.
                //    Either iOS Safari WKWebView isn't synthesising
                //    click reliably here, or some Radix Dialog event
                //    handler in the host modal is eating it.
                //
                // Current shape: handle in onPointerUp instead of
                // onClick. pointerup fires on both mouse and touch
                // *before* the click synthesis path, so it works
                // even if click never gets dispatched. We still call
                // preventDefault on mousedown to stop the textarea
                // from blurring on desktop (touch doesn't reliably
                // fire mousedown so this is mouse-only). pointerup
                // does NOT need preventDefault — its default has no
                // effect on focus.
                onMouseDown={e => e.preventDefault()}
                onPointerUp={e => {
                  e.preventDefault();
                  applyCommand(cmd);
                }}
                onMouseEnter={() => setSlashIndex(i)}
              >
                <span className={styles.slashItemLabel}>{cmd.label}</span>
                <span className={styles.slashItemDesc}>{cmd.desc}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
