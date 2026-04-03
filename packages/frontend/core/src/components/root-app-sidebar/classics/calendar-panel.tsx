import { Modal } from '@affine/component';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';

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
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [newTodoText, setNewTodoText] = useState('');

  const { getTodos, addTodo, toggleTodo, removeTodo, getDayCount } =
    useCalendarTodos();

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedTodos = useMemo(
    () => getTodos(selectedDate),
    [getTodos, selectedDate]
  );

  const goToPrev = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, [setViewYear]);

  const goToNext = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [setViewYear]);

  const handleAddTodo = useCallback(() => {
    const trimmed = newTodoText.trim();
    if (!trimmed) return;
    addTodo(selectedDate, trimmed);
    setNewTodoText('');
  }, [newTodoText, selectedDate, addTodo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddTodo();
    },
    [handleAddTodo]
  );

  // Format selected date for display
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Calendar" width={480}>
      <div className={styles.modalContent}>
        {/* Month navigation */}
        <div className={styles.calendarHeader}>
          <button className={styles.calendarNavButton} onClick={goToPrev}>
            ‹
          </button>
          <span className={styles.calendarMonthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button className={styles.calendarNavButton} onClick={goToNext}>
            ›
          </button>
        </div>

        {/* Day names header */}
        <div className={styles.calendarGrid}>
          {DAY_NAMES.map(dn => (
            <div key={dn} className={styles.calendarDayName}>
              {dn}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((cd, i) => {
            const hasTodos = getDayCount(cd.date) > 0;
            return (
              <div
                key={i}
                className={clsx(
                  styles.calendarDay,
                  cd.date === selectedDate && styles.calendarDaySelected,
                  cd.date === today &&
                    cd.date !== selectedDate &&
                    styles.calendarDayToday,
                  !cd.currentMonth && styles.calendarDayOtherMonth
                )}
                onClick={() => setSelectedDate(cd.date)}
              >
                {cd.day}
                {hasTodos && <div className={styles.calendarDot} />}
              </div>
            );
          })}
        </div>

        {/* Selected day detail */}
        <div className={styles.dayDetail}>
          <div className={styles.dayDetailTitle}>{formattedDate}</div>

          {selectedTodos.length === 0 && (
            <div
              style={{ fontSize: 13, color: 'var(--affine-text-secondary)' }}
            >
              No tasks for this day.
            </div>
          )}

          {selectedTodos.map(todo => (
            <div key={todo.id} className={styles.todoItem}>
              <input
                type="checkbox"
                className={styles.todoCheckbox}
                checked={todo.done}
                onChange={() => toggleTodo(selectedDate, todo.id)}
              />
              <span
                className={clsx(styles.todoText, todo.done && styles.todoDone)}
              >
                {todo.text}
              </span>
              <button
                className={styles.deleteButton}
                onClick={() => removeTodo(selectedDate, todo.id)}
                title="Remove task"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add task */}
          <div className={styles.addTodoRow}>
            <input
              className={styles.formInput}
              placeholder="Add a task..."
              value={newTodoText}
              onChange={e => setNewTodoText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className={styles.addButton}
              onClick={handleAddTodo}
              disabled={!newTodoText.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
