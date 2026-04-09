import clsx from 'clsx';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DAY_NAMES,
  DayCell,
  getCalendarDays,
  MONTH_NAMES,
  todayStr,
} from './calendar-panel';
import * as styles from './styles.css';

// ── Calendar canvas — "giant map" view ──────────────────────
// The right sidebar tab renders this component: a pan-and-zoom
// viewport containing a grid of month blocks. Users drag empty
// space to pan, wheel to zoom toward the cursor, and can still
// click any day cell to focus its inline mini editor. Each month
// block reuses the same DayCell / MiniEditor the modal uses, so
// content written here and content written in the Utils modal are
// the same Y.Doc-backed text.

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const INITIAL_SCALE = 0.35;
const DRAG_THRESHOLD_PX = 4;

// 4 columns × 3 rows of month blocks. Centre the current month at
// row 1 col 1 (row-major index 5) so the user lands on "today"
// with a few months visible on each side.
const COLS = 4;
const ROWS = 3;
const MONTHS_COUNT = COLS * ROWS;
const CURRENT_MONTH_INDEX = 5;

interface MonthSpec {
  year: number;
  month: number;
  isCurrent: boolean;
}

function computeMonths(centerYear: number, centerMonth: number): MonthSpec[] {
  const months: MonthSpec[] = [];
  for (let i = 0; i < MONTHS_COUNT; i++) {
    const offset = i - CURRENT_MONTH_INDEX;
    let m = centerMonth + offset;
    let y = centerYear;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    months.push({ year: y, month: m, isCurrent: offset === 0 });
  }
  return months;
}

interface Transform {
  tx: number;
  ty: number;
  s: number;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

// Ignore pointerdowns that land on interactive elements — letting
// day-cell inputs, textareas, toolbar buttons, and the MiniEditor's
// slash menu handle their own events means typing and clicking
// still work without the pan handler hijacking them.
const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest('input, textarea, button, [contenteditable="true"]');
};

// A month block. When `selected` is true we render the full editing
// surface — one DayCell per day, each mounting a live MiniEditor.
// When `selected` is false we render a cheap preview — just the day
// numbers in a tiny grid, no editors, no workspace doc wiring. This
// keeps the "map" view light: only one month's worth of editors are
// ever alive at a time, no matter how far the user zooms out. Click
// a preview to switch the selection to that month; the blue outline
// (see calendarCanvasMonthSelected) follows along.
const MonthBlock = ({
  year,
  month,
  today,
  selected,
  blockRef,
  onSelect,
}: {
  year: number;
  month: number;
  today: string;
  selected: boolean;
  blockRef?: RefObject<HTMLDivElement | null>;
  onSelect: (year: number, month: number) => void;
}) => {
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const handleClick = useCallback(() => {
    if (!selected) onSelect(year, month);
  }, [selected, onSelect, year, month]);

  return (
    <div
      ref={blockRef}
      className={clsx(
        styles.calendarCanvasMonth,
        selected && styles.calendarCanvasMonthSelected
      )}
      onClick={handleClick}
      data-selected={selected ? 'true' : undefined}
    >
      <div className={styles.calendarHeader}>
        <span className={styles.calendarMonthLabel}>
          {MONTH_NAMES[month]} {year}
        </span>
      </div>
      <div className={styles.calendarDayNamesRow}>
        {DAY_NAMES.map(dn => (
          <div key={dn} className={styles.calendarDayName}>
            {dn}
          </div>
        ))}
      </div>
      {selected ? (
        <div className={styles.calendarCanvasGrid}>
          {days.map(cd => (
            <DayCell
              key={cd.date}
              cellDate={cd.date}
              cellDayNumber={cd.day}
              isCurrentMonth={cd.currentMonth}
              isToday={cd.date === today}
            />
          ))}
        </div>
      ) : (
        <div className={styles.calendarCanvasPreviewGrid}>
          {days.map(cd => (
            <div
              key={cd.date}
              className={clsx(
                styles.calendarCanvasPreviewDay,
                !cd.currentMonth && styles.calendarCanvasPreviewDayOther,
                cd.date === today && styles.calendarCanvasPreviewDayToday
              )}
            >
              {cd.day}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const monthKey = (year: number, month: number) => `${year}-${month}`;

export const CalendarCanvas = () => {
  const today = todayStr();
  const now = useMemo(() => new Date(), []);
  const months = useMemo(
    () => computeMonths(now.getFullYear(), now.getMonth()),
    [now]
  );

  // Only one month at a time is rendered with live editors — the
  // rest are cheap day-number previews. The currently-selected
  // month starts as today's month and changes when the user clicks
  // any other preview in the canvas.
  const [selectedKey, setSelectedKey] = useState(() =>
    monthKey(now.getFullYear(), now.getMonth())
  );

  const handleSelectMonth = useCallback((year: number, month: number) => {
    setSelectedKey(monthKey(year, month));
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: 0,
    s: INITIAL_SCALE,
  });

  // Track the latest transform in a ref so pointer/wheel handlers
  // can read current values without needing to re-subscribe every
  // render, and so the pan handler can mutate world.style.transform
  // directly during a drag (React state updates per mousemove are
  // fine for a few hundred ms but add up on slow machines).
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
    const el = worldRef.current;
    if (el) {
      el.style.transform = `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.s})`;
    }
  }, [transform]);

  // Has the viewport been measured and centred on the current
  // month at least once? The sidebar tab may mount at 0×0 (sidebar
  // closed) so we wait for the first real size via ResizeObserver
  // before centring, otherwise the initial transform would put the
  // current month at (0,0) in an invisible container.
  const initializedRef = useRef(false);

  const recenterOnCurrent = useCallback(() => {
    const viewport = viewportRef.current;
    const cur = currentMonthRef.current;
    if (!viewport || !cur) return;
    if (viewport.clientWidth === 0 || viewport.clientHeight === 0) return;
    // offsetLeft / offsetTop are layout coordinates inside the
    // (untransformed) world div — the world is position: absolute
    // so it is each month's offsetParent. That gives us stable
    // positions regardless of the current scale.
    const centerX = cur.offsetLeft + cur.offsetWidth / 2;
    const centerY = cur.offsetTop + cur.offsetHeight / 2;
    const s = INITIAL_SCALE;
    const tx = viewport.clientWidth / 2 - centerX * s;
    const ty = viewport.clientHeight / 2 - centerY * s;
    setTransform({ tx, ty, s });
  }, []);

  // Centre on the current month the first time the viewport has a
  // real size, then keep tracking size changes so the map stays
  // reasonable if the user resizes the sidebar. We don't recentre
  // on every resize after the first — that would yank the camera
  // away from wherever the user panned to.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maybeInit = () => {
      if (initializedRef.current) return;
      if (viewport.clientWidth > 0 && viewport.clientHeight > 0) {
        initializedRef.current = true;
        recenterOnCurrent();
      }
    };
    maybeInit();
    const ro = new ResizeObserver(maybeInit);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [recenterOnCurrent]);

  // Wheel zoom. We attach via addEventListener so we can set
  // { passive: false } and preventDefault — React synthetic
  // onWheel is passive by default in modern React and can't block
  // the surrounding page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const prev = transformRef.current;
      // Exponential zoom keeps the felt "zoom speed" uniform no
      // matter the current scale.
      const zoomFactor = Math.exp(-e.deltaY * 0.0015);
      const nextS = clampScale(prev.s * zoomFactor);
      if (nextS === prev.s) return;
      // Zoom-to-cursor: keep the point under the cursor fixed in
      // viewport coordinates. Standard formula:
      //   t' = cursor - (cursor - t) * (nextS / prevS)
      const ratio = nextS / prev.s;
      const nextTx = cx - (cx - prev.tx) * ratio;
      const nextTy = cy - (cy - prev.ty) * ratio;
      setTransform({ tx: nextTx, ty: nextTy, s: nextS });
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  // Pan gesture state — kept in a ref so mousemove doesn't
  // schedule a React render per frame. We only commit to state on
  // pointerup, after the drag is finished.
  const panState = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origTx: number;
    origTy: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origTx: 0,
    origTy: 0,
    moved: false,
  });

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      const cur = transformRef.current;
      panState.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origTx: cur.tx,
        origTy: cur.ty,
        moved: false,
      };
      // We deliberately do NOT capture the pointer yet — if the
      // user's click never moves beyond DRAG_THRESHOLD_PX it should
      // behave as a normal click and bubble to the day cell's
      // mini-editor. Capture happens only once the drag is real.
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = panState.current;
      if (!p.active || p.pointerId !== e.pointerId) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!p.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (!p.moved) {
        p.moved = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // If capture fails the drag still works; just drop a
          // silent warning below the floorboards.
        }
        if (viewportRef.current) {
          viewportRef.current.dataset.panning = 'true';
        }
      }
      const nextTx = p.origTx + dx;
      const nextTy = p.origTy + dy;
      // Mutate transform directly during the drag — we'll sync
      // React state on pointerup. Scale is unchanged during a pan
      // so we read it from the ref.
      const world = worldRef.current;
      if (world) {
        world.style.transform = `translate(${nextTx}px, ${nextTy}px) scale(${transformRef.current.s})`;
      }
    },
    []
  );

  // When a drag exceeds the threshold we also swallow the click
  // that would otherwise fire after pointerup, so the user doesn't
  // accidentally flip the selected month every time they pan.
  const suppressNextClickRef = useRef(false);

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = panState.current;
      if (!p.active || p.pointerId !== e.pointerId) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (p.moved) {
        setTransform(prev => ({
          ...prev,
          tx: p.origTx + dx,
          ty: p.origTy + dy,
        }));
        if (viewportRef.current) {
          delete viewportRef.current.dataset.panning;
        }
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Already released — nothing to do.
        }
        suppressNextClickRef.current = true;
      }
      panState.current.active = false;
      panState.current.pointerId = null;
    },
    []
  );

  // Catch click events in the capture phase so month blocks never
  // see a click that was actually the tail end of a pan gesture.
  const handleClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    []
  );

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    const prev = transformRef.current;
    const nextS = clampScale(prev.s * factor);
    if (nextS === prev.s) return;
    const ratio = nextS / prev.s;
    const nextTx = cx - (cx - prev.tx) * ratio;
    const nextTy = cy - (cy - prev.ty) * ratio;
    setTransform({ tx: nextTx, ty: nextTy, s: nextS });
  }, []);

  return (
    <div
      ref={viewportRef}
      className={styles.calendarCanvasViewport}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div className={styles.calendarCanvasToolbar}>
        <button
          type="button"
          className={styles.calendarNavButton}
          onClick={() => zoomBy(1 / 1.25)}
          title="Zoom out"
        >
          −
        </button>
        <span className={styles.calendarCanvasZoomLabel}>
          {Math.round(transform.s * 100)}%
        </span>
        <button
          type="button"
          className={styles.calendarNavButton}
          onClick={() => zoomBy(1.25)}
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className={styles.calendarTodayButton}
          onClick={recenterOnCurrent}
          title="Recenter on today"
        >
          Today
        </button>
      </div>

      <div ref={worldRef} className={styles.calendarCanvasWorld}>
        {months.map(spec => {
          const key = monthKey(spec.year, spec.month);
          return (
            <MonthBlock
              key={key}
              year={spec.year}
              month={spec.month}
              today={today}
              selected={selectedKey === key}
              blockRef={spec.isCurrent ? currentMonthRef : undefined}
              onSelect={handleSelectMonth}
            />
          );
        })}
      </div>
    </div>
  );
};
