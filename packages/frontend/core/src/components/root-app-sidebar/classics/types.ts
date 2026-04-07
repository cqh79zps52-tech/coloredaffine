export type ResetInterval =
  | { type: 'daily' } // resets at 00:00
  | { type: 'hours'; value: number } // resets every N hours
  | { type: 'days'; value: number }; // resets every N days

export interface Habit {
  id: string;
  name: string;
  resetInterval: ResetInterval;
  createdAt: number;
  /** Dates (YYYY-MM-DD) on which the habit was completed */
  completedDates: string[];
  /** Timestamp of the last reset */
  lastReset: number;
  /** Whether it's currently checked (before next reset) */
  checked: boolean;
}

/**
 * One block inside a calendar day's mini-editor. Intentionally tiny —
 * we have one paragraph type, todos, and a single heading level. Slash
 * commands and rich block types live in the regular page editor; the
 * calendar grid prioritises being lightweight over being feature-rich.
 */
export type MiniBlockType = 'p' | 'todo' | 'h1';

export interface MiniBlock {
  id: string;
  type: MiniBlockType;
  text: string;
  /** Only meaningful when type === 'todo'. */
  done?: boolean;
}

/**
 * Stored payload for a single calendar day. The mini editor writes
 * blocks straight into the workspace Y.Doc — no per-day workspace
 * docs, no BlockSuite editor instances. See `mini-editor.tsx` for the
 * editor implementation and `use-calendar-docs.ts` for the storage hook.
 */
export interface CalendarDay {
  /** Format: YYYY-MM-DD */
  date: string;
  blocks: MiniBlock[];
}

/**
 * Legacy types kept only so older payloads can still be recognised
 * (and ignored) without crashing the calendar.
 */
export interface LegacyCalendarTodo {
  id: string;
  text: string;
  done: boolean;
}

export interface LegacyCalendarDay {
  date: string;
  todos: LegacyCalendarTodo[];
}

export interface LegacyCalendarDayDocLink {
  date: string;
  docId: string;
}
