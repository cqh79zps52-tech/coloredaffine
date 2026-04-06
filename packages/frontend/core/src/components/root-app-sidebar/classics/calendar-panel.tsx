import { Modal } from '@affine/component';
import clsx from 'clsx';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as styles from './styles.css';
import { useCalendarTodos } from './use-calendar-todos';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

interface CalendarGridDay {
  date: string;
  day: number;
  currentMonth: boolean;
}

function getCalendarDays(year: number, month: number): CalendarGridDay[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0 ... Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: CalendarGridDay[] = [];

  // Previous month fill
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    days.push({ date: toDateStr(py, pm, d), day: d, currentMonth: false });
  }

  // Current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: toDateStr(year, month, d), day: d, currentMonth: true });
  }

  // Next month fill
  const remaining = 42 - days.length; // 6 rows
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    days.push({ date: toDateStr(ny, nm, d), day: d, currentMonth: false });
  }

  return days;
}

interface DayCellProps {
  cellDate: string;
  cellDayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  todos: ReturnType<ReturnType<typeof useCalendarTodos>['getTodos']>;
  onAdd: (date: string, text: string) => void;
  onToggle: (date: string, todoId: string) => void;
  onRemove: (date: string, todoId: string) => void;
}

const DayCell = ({
  cellDate,
  cellDayNumber,
  isCurrentMonth,
  isToday,
  todos,
  onAdd,
  onToggle,
  onRemove,
}: DayCellProps) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(cellDate, trimmed);
    setDraft('');
    setAdding(false);
  }, [draft, cellDate, onAdd]);

  const cancel = useCallback(() => {
    setDraft('');
    setAdding(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
      else if (e.key === 'Escape') cancel();
    },
    [commit, cancel]
  );

  return (
    <div
      className={clsx(
        styles.calendarDayCell,
        !isCurrentMonth && styles.calendarDayCellOtherMonth,
        isToday && styles.calendarDayCellToday
      )}
    >
      <div className={styles.calendarDayHeader}>
        <span
          className={clsx(
            styles.calendarDayNumber,
            isToday && styles.calendarDayNumberToday
          )}
        >
          {cellDayNumber}
        </span>
      </div>

      <div className={styles.calendarDayTodoList}>
        {todos.map(todo => (
          <div key={todo.id} className={styles.calendarDayTodoItem}>
            <input
              type="checkbox"
              className={styles.calendarTodoCheckbox}
              checked={todo.done}
              onChange={() => onToggle(cellDate, todo.id)}
            />
            <span
              className={clsx(
                styles.calendarDayTodoText,
                todo.done && styles.calendarDayTodoDone
              )}
              title={todo.text}
            >
              {todo.text}
            </span>
            <button
              type="button"
              className={styles.calendarDayTodoDelete}
              onClick={() => onRemove(cellDate, todo.id)}
              title="Remove task"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <input
          ref={inputRef}
          className={styles.calendarDayAddInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="New task…"
        />
      ) : (
        <button
          type="button"
          className={styles.calendarDayAddButton}
          onClick={() => setAdding(true)}
          title="Add a task"
        >
          +
        </button>
      )}
    </div>
  );
};

export const CalendarPanel = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const today = todayStr();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { getTodos, addTodo, toggleTodo, removeTodo } = useCalendarTodos();

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const goToPrev = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, [setViewYear, setViewMonth]);

  const goToNext = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [setViewYear, setViewMonth]);

  const goToToday = useCallback(() => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [setViewYear, setViewMonth]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Calendar"
      width="min(95vw, 1400px)"
      height="min(92vh, 900px)"
    >
      <div className={styles.calendarModalContent}>
        <div className={styles.calendarHeader}>
          <span className={styles.calendarMonthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className={styles.calendarNavGroup}>
            <button
              type="button"
              className={styles.calendarNavButton}
              onClick={goToPrev}
              title="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.calendarTodayButton}
              onClick={goToToday}
            >
              Today
            </button>
            <button
              type="button"
              className={styles.calendarNavButton}
              onClick={goToNext}
              title="Next month"
            >
              ›
            </button>
          </div>
        </div>

        <div className={styles.calendarDayNamesRow}>
          {DAY_NAMES.map(dn => (
            <div key={dn} className={styles.calendarDayName}>
              {dn}
            </div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {calendarDays.map(cd => (
            <DayCell
              key={cd.date}
              cellDate={cd.date}
              cellDayNumber={cd.day}
              isCurrentMonth={cd.currentMonth}
              isToday={cd.date === today}
              todos={getTodos(cd.date)}
              onAdd={addTodo}
              onToggle={toggleTodo}
              onRemove={removeTodo}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
