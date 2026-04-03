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

export interface CalendarTodo {
  id: string;
  text: string;
  done: boolean;
}

export interface CalendarDay {
  /** Format: YYYY-MM-DD */
  date: string;
  todos: CalendarTodo[];
}
