import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

// ── Modal shared ──────────────────────────────────────────────
export const modalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '0 4px',
  maxHeight: '70vh',
  overflowY: 'auto',
});

export const modalTitle = style({
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
});

export const emptyMessage = style({
  color: cssVarV2.text.secondary,
  fontSize: 13,
  textAlign: 'center',
  padding: '24px 0',
});

// ── Add form ──────────────────────────────────────────────────
export const addForm = style({
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
});

export const addFormInputs = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: 1,
});

export const formRow = style({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

export const formLabel = style({
  fontSize: 12,
  color: cssVarV2.text.secondary,
  minWidth: 40,
});

export const formInput = style({
  flex: 1,
  height: 32,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 13,
  outline: 'none',
  ':focus': {
    borderColor: cssVarV2.button.primary,
  },
});

export const formSelect = style({
  height: 32,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
});

export const numberInput = style({
  width: 60,
  height: 32,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 13,
  outline: 'none',
  textAlign: 'center',
});

export const addButton = style({
  height: 32,
  padding: '0 14px',
  borderRadius: 6,
  border: 'none',
  backgroundColor: cssVarV2.button.primary,
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  ':hover': {
    opacity: 0.9,
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

// ── Custom checkbox ───────────────────────────────────────────
// Native <input type="checkbox"> renders inconsistently across OSes
// (sometimes invisible against the AFFiNE theme background). Use
// appearance:none + an explicit visible box so the user can actually
// see whether a habit / todo is checked.
const checkboxBase = {
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  margin: 0,
  cursor: 'pointer',
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1.5px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  borderRadius: 4,
  transition: 'background-color 0.15s, border-color 0.15s',
};

export const habitCheckbox = style({
  ...checkboxBase,
  width: 16,
  height: 16,
  minWidth: 16,
  maxWidth: 16,
  flex: '0 0 16px',
  ':hover': {
    borderColor: cssVarV2.button.primary,
  },
});

export const todoCheckbox = style({
  ...checkboxBase,
  width: 18,
  height: 18,
  ':hover': {
    borderColor: cssVarV2.button.primary,
  },
});

// Checked state: filled background + white check via SVG data URI.
// We render the check as a CSS background-image so it scales with the
// checkbox dimensions and doesn't depend on font support.
const checkedStyle = {
  backgroundColor: cssVarV2.button.primary,
  borderColor: cssVarV2.button.primary,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-6' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundSize: '85% 85%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

globalStyle(`${habitCheckbox}:checked`, checkedStyle);
globalStyle(`${todoCheckbox}:checked`, checkedStyle);

// ── Habits ────────────────────────────────────────────────────
export const habitList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

export const habitItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 8,
  backgroundColor: cssVarV2.layer.background.secondary,
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const habitInfo = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
});

export const habitName = style({
  fontSize: 14,
  fontWeight: 500,
  color: cssVarV2.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const habitMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: cssVarV2.text.secondary,
});

export const streakBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  padding: '1px 6px',
  borderRadius: 10,
  backgroundColor: cssVarV2.layer.background.primary,
  fontSize: 11,
  fontWeight: 600,
});

export const resetLabel = style({
  fontSize: 11,
  color: cssVarV2.text.tertiary,
});

export const deleteButton = style({
  background: 'none',
  border: 'none',
  color: cssVarV2.text.tertiary,
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  fontSize: 16,
  lineHeight: 1,
  flexShrink: 0,
  ':hover': {
    color: cssVarV2.text.primary,
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

// ── Calendar (full-page month view) ───────────────────────────
// Wider, taller modal so the calendar feels like a real page rather
// than a sidebar popover. The Modal wrapper provides the outer
// width/height; this content fills 100% of that.
export const calendarModalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '0 4px',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
});

export const calendarHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 8px',
});

export const calendarMonthLabel = style({
  fontSize: 22,
  fontWeight: 700,
  color: cssVarV2.text.primary,
});

export const calendarNavGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

export const calendarNavButton = style({
  background: 'none',
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  cursor: 'pointer',
  fontSize: 16,
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  color: cssVarV2.text.primary,
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
    borderColor: cssVarV2.button.primary,
  },
});

export const calendarTodayButton = style({
  height: 32,
  padding: '0 12px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: 'none',
  color: cssVarV2.text.primary,
  fontSize: 13,
  cursor: 'pointer',
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
    borderColor: cssVarV2.button.primary,
  },
});

export const calendarGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gridAutoRows: 'minmax(220px, 1fr)',
  gap: 6,
  flex: 1,
  minHeight: 0,
  // Each day hosts a real mini editor, so cells need real estate. If
  // the viewport can't fit every row at the requested minimum height
  // we'd rather scroll the grid than crush each editor unusably small.
  overflowY: 'auto',
});

export const calendarDayNamesRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 4,
});

export const calendarDayName = style({
  fontSize: 12,
  fontWeight: 600,
  color: cssVarV2.text.tertiary,
  padding: '6px 0',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

// Each day cell hosts an in-house MiniEditor (mini-editor.tsx) — a few
// React inputs, no BlockSuite, no per-cell workspace doc. Multiple
// cells can be edited at the same time.
export const calendarDayCell = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  borderRadius: 8,
  backgroundColor: cssVarV2.layer.background.primary,
  padding: 8,
  gap: 4,
  overflow: 'hidden',
  minHeight: 0,
});

export const calendarDayBody = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
});

// ── Mini editor (calendar day cell body) ─────────────────────
// Hand-rolled tiny editor; see mini-editor.tsx. The styles below try
// to make a stack of <input>s feel like a continuous block editor:
// no input borders, tight line height, hover/focus only on the row
// you're touching.
export const miniEditor = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '2px 0',
});

export const miniRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '1px 2px',
  borderRadius: 3,
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const miniRowTodo = style({});

export const miniRowH1 = style({
  marginTop: 2,
});

export const miniCheckbox = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  margin: 0,
  cursor: 'pointer',
  flexShrink: 0,
  width: 13,
  height: 13,
  minWidth: 13,
  border: `1.5px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  borderRadius: 3,
  transition: 'background-color 0.15s, border-color 0.15s',
  ':hover': {
    borderColor: cssVarV2.button.primary,
  },
});

globalStyle(`${miniCheckbox}:checked`, {
  backgroundColor: cssVarV2.button.primary,
  borderColor: cssVarV2.button.primary,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-6' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundSize: '85% 85%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

export const miniInput = style({
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: cssVarV2.text.primary,
  fontSize: 12,
  lineHeight: 1.35,
  padding: '1px 2px',
  fontFamily: 'inherit',
  // Native placeholder colour is too aggressive against the cell bg.
  '::placeholder': {
    color: cssVarV2.text.tertiary,
    opacity: 1,
  },
});

export const miniInputH1 = style({
  fontSize: 14,
  fontWeight: 700,
  color: cssVarV2.text.primary,
});

export const miniInputDone = style({
  textDecoration: 'line-through',
  color: cssVarV2.text.tertiary,
});

export const calendarDayCellOtherMonth = style({
  opacity: 0.45,
  backgroundColor: cssVarV2.layer.background.secondary,
});

export const calendarDayCellToday = style({
  borderColor: cssVarV2.button.primary,
  borderWidth: 2,
  padding: 5, // compensate for the thicker border
});

export const calendarDayHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 2,
});

export const calendarDayNumber = style({
  fontSize: 14,
  fontWeight: 600,
  color: cssVarV2.text.primary,
  lineHeight: 1,
});

export const calendarDayNumberToday = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: cssVarV2.button.primary,
  color: '#fff',
  fontSize: 12,
});

// ── Habits panel todo / shared item rows (legacy keys kept for the
// habits panel which still uses the modal layout) ────────────
export const todoItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
});

export const todoText = style({
  flex: 1,
  fontSize: 13,
  color: cssVarV2.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const todoDone = style({
  textDecoration: 'line-through',
  color: cssVarV2.text.tertiary,
});

export const addTodoRow = style({
  display: 'flex',
  gap: 6,
  marginTop: 4,
});

globalStyle(`${addTodoRow} input`, {
  flex: 1,
});
