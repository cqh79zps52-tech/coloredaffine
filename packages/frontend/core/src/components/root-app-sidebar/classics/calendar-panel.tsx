import { Modal } from '@affine/component';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';

import { DayEditorCellBody } from './day-editor-cell';
import * as styles from './styles.css';
import { useCalendarDocs } from './use-calendar-docs';
// Each calendar day owns a tiny in-house editor (see mini-editor.tsx).
// Because nothing in that editor touches global state, every cell can
// be live at the same time — no more "only one active day" gating.

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

function formatLongDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; we want "Wednesday, April 8 2026". We
  // build a Date in local time so DST doesn't shift us by a day.
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return `${weekdays[dt.getDay()]}, ${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()} ${dt.getFullYear()}`;
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
}

const DayCell = ({
  cellDate,
  cellDayNumber,
  isCurrentMonth,
  isToday,
}: DayCellProps) => {
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
      {isCurrentMonth ? (
        <DayEditorCellBody date={cellDate} />
      ) : (
        <div className={styles.calendarDayBody} />
      )}
    </div>
  );
};

/**
 * Mobile-only compact day cell. Strips the inline mini-editor in
 * favour of a tap target — the desktop layout is unusable on a phone
 * (cells become 50px wide × 220px tall, no room to type) so on mobile
 * we treat the grid as a picker and open a dedicated day-detail
 * screen on tap.
 */
const CompactDayCell = ({
  cellDate,
  cellDayNumber,
  isCurrentMonth,
  isToday,
  hasContent,
  onSelect,
}: DayCellProps & {
  hasContent: boolean;
  onSelect: (date: string) => void;
}) => {
  return (
    <button
      type="button"
      className={clsx(
        styles.calendarDayCellCompact,
        !isCurrentMonth && styles.calendarDayCellOtherMonth,
        isToday && styles.calendarDayCellToday
      )}
      onClick={() => onSelect(cellDate)}
    >
      <span
        className={clsx(
          styles.calendarDayNumber,
          isToday && styles.calendarDayNumberToday
        )}
      >
        {cellDayNumber}
      </span>
      {hasContent && <span className={styles.calendarDayDot} />}
    </button>
  );
};

const CalendarMonthGrid = ({
  calendarDays,
  today,
  compact,
  hasContentFn,
  onSelect,
}: {
  calendarDays: CalendarGridDay[];
  today: string;
  compact: boolean;
  hasContentFn: (date: string) => boolean;
  onSelect: (date: string) => void;
}) => {
  if (compact) {
    return (
      <div className={styles.calendarGridCompact}>
        {calendarDays.map(cd => (
          <CompactDayCell
            key={cd.date}
            cellDate={cd.date}
            cellDayNumber={cd.day}
            isCurrentMonth={cd.currentMonth}
            isToday={cd.date === today}
            hasContent={hasContentFn(cd.date)}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }
  return (
    <div className={styles.calendarGrid}>
      {calendarDays.map(cd => (
        <DayCell
          key={cd.date}
          cellDate={cd.date}
          cellDayNumber={cd.day}
          isCurrentMonth={cd.currentMonth}
          isToday={cd.date === today}
        />
      ))}
    </div>
  );
};

/**
 * Mobile day-detail screen. Replaces the grid contents while a day is
 * selected: a back arrow returns to the month picker, the date label
 * sits at the top, and the existing MiniEditor fills the body. The
 * MiniEditor lives at full mobile width here, which is the only place
 * the calendar can offer a usable typing surface on a phone.
 */
const MobileDayDetail = ({
  date,
  onBack,
}: {
  date: string;
  onBack: () => void;
}) => {
  return (
    <div className={styles.calendarDayDetail}>
      <div className={styles.calendarDayDetailHeader}>
        <button
          type="button"
          className={styles.calendarDayDetailBack}
          onClick={onBack}
          aria-label="Back to month"
        >
          ‹
        </button>
        <span className={styles.calendarDayDetailTitle}>
          {formatLongDate(date)}
        </span>
      </div>
      <div className={styles.calendarDayDetailBody}>
        <DayEditorCellBody date={date} />
      </div>
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
  // Mobile-only: which day is currently being edited in the detail
  // overlay. `null` means we're showing the picker grid.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Build-time constant — set to true for the @affine/mobile build,
  // false for the desktop build. Tree-shaken in each bundle so the
  // unused branch costs nothing.
  const isMobile = BUILD_CONFIG.isMobileEdition;

  const { hasContent } = useCalendarDocs();

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

  const handleSelectDay = useCallback((date: string) => {
    setSelectedDay(date);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedDay(null);
  }, []);

  // Mobile detail view replaces the entire modal content.
  if (isMobile && selectedDay) {
    return (
      <Modal
        open={open}
        onOpenChange={next => {
          // Closing the modal also exits day-detail so reopening
          // lands on the picker, which is the expected entry point.
          if (!next) setSelectedDay(null);
          onOpenChange(next);
        }}
        title={undefined}
        fullScreen
        // Same close-button offset as the picker view so the X is
        // not stuck under the iOS status bar.
        closeButtonOptions={{ className: styles.modalCloseButtonMobileOffset }}
      >
        <MobileDayDetail date={selectedDay} onBack={handleBackFromDetail} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Calendar"
      // On desktop the calendar is a wide modal because each cell
      // hosts a real editor. On mobile we go fullScreen so the
      // compact picker fills the screen and the day-detail view has
      // somewhere to live.
      width={isMobile ? undefined : 'min(98vw, 1800px)'}
      height={isMobile ? undefined : 'min(96vh, 1100px)'}
      fullScreen={isMobile}
      // Push the title and close button below the iOS status bar /
      // notch on mobile. Both classes only fire inside the
      // [data-full-screen="true"] selector, so the desktop modal
      // header is unaffected.
      headerClassName={styles.modalHeaderMobileOffset}
      closeButtonOptions={{ className: styles.modalCloseButtonMobileOffset }}
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

        <CalendarMonthGrid
          calendarDays={calendarDays}
          today={today}
          compact={isMobile}
          hasContentFn={hasContent}
          onSelect={handleSelectDay}
        />
      </div>
    </Modal>
  );
};
