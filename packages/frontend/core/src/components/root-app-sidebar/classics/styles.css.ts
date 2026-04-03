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
  border: `1px solid ${cssVarV2.layer.border}`,
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
  border: `1px solid ${cssVarV2.layer.border}`,
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
  border: `1px solid ${cssVarV2.layer.border}`,
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

export const habitCheckbox = style({
  width: 18,
  height: 18,
  cursor: 'pointer',
  flexShrink: 0,
  accentColor: cssVarV2.button.primary,
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

// ── Calendar ──────────────────────────────────────────────────
export const calendarGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 2,
  textAlign: 'center',
});

export const calendarHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
});

export const calendarMonthLabel = style({
  fontSize: 15,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const calendarNavButton = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  padding: '4px 10px',
  borderRadius: 6,
  color: cssVarV2.text.primary,
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const calendarDayName = style({
  fontSize: 11,
  fontWeight: 600,
  color: cssVarV2.text.tertiary,
  padding: '4px 0',
});

export const calendarDay = style({
  position: 'relative',
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  color: cssVarV2.text.primary,
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const calendarDaySelected = style({
  backgroundColor: cssVarV2.button.primary,
  color: '#fff',
  fontWeight: 600,
  ':hover': {
    backgroundColor: cssVarV2.button.primary,
    opacity: 0.9,
  },
});

export const calendarDayToday = style({
  fontWeight: 700,
  boxShadow: `inset 0 0 0 1.5px ${cssVarV2.button.primary}`,
  borderRadius: 8,
});

export const calendarDayOtherMonth = style({
  color: cssVarV2.text.disable,
});

export const calendarDot = style({
  position: 'absolute',
  bottom: 3,
  width: 4,
  height: 4,
  borderRadius: '50%',
  backgroundColor: cssVarV2.button.primary,
});

// ── Day detail panel ──────────────────────────────────────────
export const dayDetail = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 8,
  padding: '12px',
  borderRadius: 8,
  backgroundColor: cssVarV2.layer.background.secondary,
});

export const dayDetailTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: cssVarV2.text.primary,
  marginBottom: 4,
});

export const todoItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
});

export const todoCheckbox = style({
  width: 16,
  height: 16,
  cursor: 'pointer',
  flexShrink: 0,
  accentColor: cssVarV2.button.primary,
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
