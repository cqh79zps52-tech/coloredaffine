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
 * Each calendar day is backed by a real workspace doc, so users can use
 * the full editor (slash commands like /todo, /h1, etc.) on it. We only
 * persist a small mapping from date → docId here.
 */
export interface CalendarDay {
  /** Format: YYYY-MM-DD */
  date: string;
  /** Workspace doc id that holds the day's notes. */
  docId: string;
}

/**
 * Legacy type kept only so the localStorage migration can still parse
 * old payloads from before per-day docs existed.
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
