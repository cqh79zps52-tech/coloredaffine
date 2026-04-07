import { Modal } from '@affine/component';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';

import * as styles from './styles.css';
import { useCalendarDocs } from './use-calendar-docs';

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
  hasDoc: boolean;
  onOpen: (date: string) => void;
}

const DayCell = ({
  cellDate,
  cellDayNumber,
  isCurrentMonth,
  isToday,
  hasDoc,
  onOpen,
}: DayCellProps) => {
  const handleClick = useCallback(() => {
    onOpen(cellDate);
  }, [cellDate, onOpen]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        styles.calendarDayCell,
        styles.calendarDayCellButton,
        !isCurrentMonth && styles.calendarDayCellOtherMonth,
        isToday && styles.calendarDayCellToday
      )}
      title={`Open ${cellDate}`}
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
        {hasDoc && <span className={styles.calendarDayDocDot} />}
      </div>
      <div className={styles.calendarDayBody}>
        {hasDoc ? (
          <span className={styles.calendarDayBodyText}>Open notes</span>
        ) : (
          <span className={styles.calendarDayBodyPlaceholder}>
            Click to write…
          </span>
        )}
      </div>
    </button>
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

  const { getDocId, ensureDocForDate } = useCalendarDocs();
  const workbenchService = useService(WorkbenchService);

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

  const handleOpenDay = useCallback(
    (date: string) => {
      const docId = ensureDocForDate(date);
      workbenchService.workbench.openDoc(docId);
      onOpenChange(false);
    },
    [ensureDocForDate, workbenchService, onOpenChange]
  );

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
              hasDoc={!!getDocId(cd.date)}
              onOpen={handleOpenDay}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
