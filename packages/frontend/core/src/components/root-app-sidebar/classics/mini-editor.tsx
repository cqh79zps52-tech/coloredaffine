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
import type { MiniBlock, MiniBlockMarks, MiniBlockType } from './types';

/**
 * Whole-block format toolbar palette. We deliberately keep the lists
 * short — the calendar day cells are tiny and a sprawling Notion-style
 * colour grid would be unusable. The first option in each list is the
 * "no value" option that clears the mark.
 */
const HIGHLIGHT_SWATCHES: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'None' },
  { value: '#fff3a0', label: 'Yellow' },
  { value: '#ffd0d0', label: 'Pink' },
  { value: '#d0ecff', label: 'Blue' },
  { value: '#d6f5d0', label: 'Green' },
  { value: '#e6d6ff', label: 'Purple' },
];
const COLOR_SWATCHES: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Default' },
  { value: '#d93025', label: 'Red' },
  { value: '#e8710a', label: 'Orange' },
  { value: '#188038', label: 'Green' },
  { value: '#1967d2', label: 'Blue' },
  { value: '#9334e6', label: 'Purple' },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyParagraph(): MiniBlock {
  return { id: uid(), type: 'p', text: '' };
}

/**
 * One slash-command entry. `apply` returns the new shape for the block
 * being transformed; the editor preserves the block id so React keeps
 * the same DOM input and the caret can be re-focused after the swap.
 */
interface SlashCommand {
  id: string;
  label: string;
  desc: string;
  /** Substrings that should also match this command from the query. */
  keywords: string[];
  apply: () => { type: MiniBlockType; text: string; done?: boolean };
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

  // Which block currently has the caret. Used by the formatting
  // toolbar so it knows which block to apply marks to. We track this
  // alongside (rather than reading from document.activeElement) so the
  // toolbar can stay open while the user clicks one of its buttons —
  // the textarea blurs momentarily, but the toolbar's mousedown
  // handler keeps `focusedBlockId` set so the action lands on the
  // right block.
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

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
      const idx = blocks.findIndex(b => b.id === slashState.blockId);
      if (idx === -1) {
        setSlashState(null);
        return;
      }
      const block = blocks[idx];
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
    [blocks, slashState, emit]
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
   * Apply (or clear) a whole-block formatting mark on the currently
   * focused block. Used by the floating formatting toolbar.
   */
  const applyMark = useCallback(
    <K extends keyof MiniBlockMarks>(key: K, value: MiniBlockMarks[K]) => {
      if (!focusedBlockId) return;
      const idx = blocks.findIndex(b => b.id === focusedBlockId);
      if (idx === -1) return;
      const block = blocks[idx];
      const nextMarks: MiniBlockMarks = { ...block.marks };
      if (value === undefined || value === null || value === false) {
        delete nextMarks[key];
      } else {
        nextMarks[key] = value;
      }
      const next = blocks.slice();
      next[idx] = {
        ...block,
        marks: Object.keys(nextMarks).length > 0 ? nextMarks : undefined,
      };
      // Re-focus the block we just formatted — the toolbar buttons
      // briefly steal focus when clicked, and we want the caret back.
      pendingFocusRef.current = { id: block.id, pos: 0 };
      emit(next);
    },
    [blocks, focusedBlockId, emit]
  );

  const focusedBlock = useMemo(
    () => blocks.find(b => b.id === focusedBlockId) ?? null,
    [blocks, focusedBlockId]
  );

  // Close the slash menu when the input loses focus to anything other
  // than the menu itself. We do that with a microtask delay so a click
  // on a menu item still has time to register.
  //
  // The same delay is used to clear `focusedBlockId` so the formatting
  // toolbar (which lives outside the textarea) can keep itself open
  // while the user clicks one of its buttons. The toolbar marks its
  // root element with `data-mini-toolbar="1"`; if focus moves there we
  // leave the focus state alone.
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active instanceof HTMLElement) {
        if (active.dataset.miniSlash === '1') return;
        if (active.closest('[data-mini-toolbar="1"]')) return;
      }
      setSlashState(null);
      setFocusedBlockId(null);
    }, 0);
  }, []);

  const handleFocus = useCallback((id: string) => {
    setFocusedBlockId(id);
  }, []);

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
            <textarea
              ref={el => {
                inputsRef.current.set(b.id, el);
              }}
              className={clsx(
                styles.miniInput,
                b.type === 'h1' && styles.miniInputH1,
                b.type === 'todo' && b.done && styles.miniInputDone
              )}
              // Whole-block marks are applied via inline style so they
              // don't blow up the static CSS surface. The textarea is
              // a single editable surface so we can't host inline
              // spans without rewriting the editor on contentEditable;
              // whole-block colour / highlight / underline cover the
              // calendar use cases.
              style={{
                color: b.marks?.color,
                backgroundColor: b.marks?.highlight,
                textDecoration: b.marks?.underline ? 'underline' : undefined,
              }}
              value={b.text}
              placeholder={showPlaceholder ? placeholder : undefined}
              onChange={e => handleTextChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={() => handleFocus(b.id)}
              onBlur={handleBlur}
              spellCheck={false}
              autoComplete="off"
              rows={1}
              wrap="soft"
            />
          </div>
        );
      })}

      {focusedBlock && !slashState && typeof document !== 'undefined'
        ? createPortal(
            <FormatToolbar
              block={focusedBlock}
              anchorEl={inputsRef.current.get(focusedBlock.id) ?? null}
              onApply={applyMark}
            />,
            document.body
          )
        : null}

      {slashState &&
        filteredCommands.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.slashMenu}
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
                // The previous version called `applyCommand` directly
                // from `onMouseDown`. That synchronously set
                // `slashState` to null and emitted new blocks, so by
                // the time React finished the event React had already
                // unmounted the portal — the corresponding mouseup /
                // click / touchend then fired on a button that no
                // longer existed and the user just saw "nothing
                // happened". On mobile this was even worse because
                // tap → click can fire without an intermediate
                // mousedown at all.
                //
                // Split the responsibilities:
                //   - `onMouseDown` / `onPointerDown` only call
                //     `preventDefault()` so the host textarea keeps
                //     focus (otherwise blur → handleBlur() closes the
                //     menu before the click resolves).
                //   - `onClick` is the actual confirm action. By the
                //     time `click` fires the menu is still mounted, so
                //     the React handler runs cleanly. `click` is
                //     synthesised on touch end too, so this also
                //     covers finger taps on mobile.
                onMouseDown={e => e.preventDefault()}
                onPointerDown={e => e.preventDefault()}
                onClick={e => {
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

/**
 * Floating whole-block formatting toolbar. Anchored just above the
 * focused textarea (or below if there's no room above) using viewport
 * coordinates, so it works inside scroll containers and modals
 * without escaping clipped parents. The toolbar is mounted in a
 * portal to document.body for the same reason.
 */
const FormatToolbar = ({
  block,
  anchorEl,
  onApply,
}: {
  block: MiniBlock;
  anchorEl: HTMLTextAreaElement | null;
  onApply: <K extends keyof MiniBlockMarks>(
    key: K,
    value: MiniBlockMarks[K]
  ) => void;
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  // Recompute the toolbar position whenever the focused block changes
  // or its rect moves (window resize / scroll). We piggy-back on the
  // browser's resize/scroll events because the only thing that moves
  // the textarea is layout.
  useLayoutEffect(() => {
    if (!anchorEl) {
      setPos(null);
      return;
    }
    const compute = () => {
      const r = anchorEl.getBoundingClientRect();
      const TOOLBAR_HEIGHT = 36;
      const margin = 6;
      let top = r.top - TOOLBAR_HEIGHT - margin;
      // Flip below if it would clip the viewport top.
      if (top < 8) top = r.bottom + margin;
      setPos({ top, left: r.left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [anchorEl, block.id]);

  if (!pos) return null;

  // Tag every interactive element with `data-mini-toolbar="1"` so the
  // editor's blur-cleanup logic can recognise focus moving here and
  // not tear the toolbar down mid-click.
  return (
    <div
      data-mini-toolbar="1"
      className={styles.formatToolbar}
      style={{ top: pos.top, left: pos.left }}
      // Don't let mousedown bubble out and steal focus from the
      // textarea before the click handler runs.
      onMouseDown={e => e.preventDefault()}
    >
      <button
        type="button"
        data-mini-toolbar="1"
        className={clsx(
          styles.formatButton,
          block.marks?.underline && styles.formatButtonActive
        )}
        onMouseDown={e => e.preventDefault()}
        onClick={() => onApply('underline', !block.marks?.underline)}
        title="Underline"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>

      <div className={styles.formatToolbarSep} />

      <button
        type="button"
        data-mini-toolbar="1"
        className={clsx(
          styles.formatButton,
          block.marks?.highlight && styles.formatButtonActive
        )}
        onMouseDown={e => e.preventDefault()}
        onClick={() => {
          setHighlightOpen(o => !o);
          setColorOpen(false);
        }}
        title="Highlight"
      >
        <span
          className={styles.formatSwatchPreview}
          style={{ background: block.marks?.highlight ?? 'transparent' }}
        />
        <span>H</span>
      </button>
      {highlightOpen && (
        <div className={styles.formatPalette} data-mini-toolbar="1">
          {HIGHLIGHT_SWATCHES.map(s => (
            <button
              key={s.label}
              type="button"
              data-mini-toolbar="1"
              className={styles.formatSwatchButton}
              title={s.label}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onApply('highlight', s.value ?? undefined);
                setHighlightOpen(false);
              }}
            >
              <span
                className={styles.formatSwatch}
                style={{
                  background: s.value ?? 'transparent',
                  border: s.value ? undefined : '1px dashed currentColor',
                }}
              />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        data-mini-toolbar="1"
        className={clsx(
          styles.formatButton,
          block.marks?.color && styles.formatButtonActive
        )}
        onMouseDown={e => e.preventDefault()}
        onClick={() => {
          setColorOpen(o => !o);
          setHighlightOpen(false);
        }}
        title="Text colour"
      >
        <span
          style={{ color: block.marks?.color ?? undefined, fontWeight: 700 }}
        >
          A
        </span>
      </button>
      {colorOpen && (
        <div className={styles.formatPalette} data-mini-toolbar="1">
          {COLOR_SWATCHES.map(s => (
            <button
              key={s.label}
              type="button"
              data-mini-toolbar="1"
              className={styles.formatSwatchButton}
              title={s.label}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onApply('color', s.value ?? undefined);
                setColorOpen(false);
              }}
            >
              <span
                className={styles.formatSwatch}
                style={{
                  background: s.value ?? 'transparent',
                  border: s.value ? undefined : '1px dashed currentColor',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
