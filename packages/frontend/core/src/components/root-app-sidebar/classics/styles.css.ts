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

// ── Modal header / close button mobile offsets ──────────────
// On mobile the calendar / habits Modal goes fullScreen, but the
// Modal's built-in title and close button still sit at the default
// 20px top of the modal content — which on iPhone puts them
// underneath the status bar / dynamic island. These two classes are
// passed as headerClassName and closeButtonOptions.className from
// CalendarPanel and HabitsPanel; they only kick in inside the
// fullScreen variant (the desktop modal is unaffected).
//
// We override the existing closeButton class's `top: 22px` rule by
// using a more specific selector (attribute + class) so the rule
// wins on cascade without needing !important.
export const modalHeaderMobileOffset = style({
  selectors: {
    '[data-full-screen="true"] &': {
      marginTop: 36,
    },
  },
});

export const modalCloseButtonMobileOffset = style({
  selectors: {
    '[data-full-screen="true"] &': {
      top: 58,
    },
  },
});

// ── Calendar (full-page month view) ───────────────────────────
// Wider, taller modal so the calendar feels like a real page rather
// than a sidebar popover. The Modal wrapper provides the outer
// width/height; this content fills 100% of that.
//
// Top padding: previously we used max(8px, env(safe-area-inset-top))
// — but iOS Capacitor's WKWebView sits *below* the status bar by
// default (AffineViewController has edgesForExtendedLayout = []), so
// env(safe-area-inset-top) resolves to 0 inside the webview because
// from the webview's perspective there's nothing to inset. The
// content ended up flush with the modal top and the user reported
// the day-detail header conflicted with the phone UI. Solution: on
// the fullScreen variant (which only happens on mobile, since the
// desktop modal is never fullScreen) push content down by a fixed
// 48px and *also* honour env() in case a future iOS version or a
// notched Android device returns a real value.
export const calendarModalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingLeft: 4,
  paddingRight: 4,
  paddingTop: 8,
  paddingBottom: 8,
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  selectors: {
    // Modal sets data-full-screen on its wrapper. We can't query the
    // wrapper directly from a child class, but the wrapper applies
    // the attribute to itself and the selector cascades to descendants
    // via the `&` ancestor combinator.
    '[data-full-screen="true"] &': {
      paddingTop: 'max(48px, env(safe-area-inset-top, 0px))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    },
  },
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
  // Drop the 220px minimum so 6 rows always fit inside the modal
  // viewport instead of overflowing the bottom. Each cell still owns
  // a scrollable mini editor that uses overflow:auto for content
  // taller than the cell.
  gridAutoRows: 'minmax(110px, 1fr)',
  gap: 6,
  flex: 1,
  minHeight: 0,
  // Defensive: if the viewport is *really* short (e.g. landscape
  // phone) the rows will still be smaller than 110px because we
  // hard-cap with `1fr`, but in case 6 × the row min ever exceeds
  // available height we let the grid scroll instead of pushing the
  // bottom past the modal.
  overflowY: 'auto',
});

// Mobile-only: a compact picker grid (just day numbers + a content
// dot) that fits a phone screen. Each cell becomes a tap target
// rather than a host for an inline editor; tapping opens the day
// detail screen instead.
export const calendarGridCompact = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gridAutoRows: 'minmax(56px, auto)',
  gap: 4,
  flex: 'none',
});

export const calendarDayCellCompact = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  borderRadius: 8,
  backgroundColor: cssVarV2.layer.background.primary,
  padding: '8px 4px',
  fontSize: 16,
  fontWeight: 500,
  color: cssVarV2.text.primary,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  outline: 'none',
  // Bigger touch target without growing the visible cell.
  minHeight: 56,
  ':active': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const calendarDayDot = style({
  display: 'block',
  width: 6,
  height: 6,
  marginTop: 4,
  borderRadius: '50%',
  backgroundColor: cssVarV2.button.primary,
});

// Mobile day-detail screen — fills the modal once the user taps a
// cell. Same fixed mobile-only top padding story as the calendar
// month grid above: env(safe-area-inset-top) is 0 inside Capacitor's
// WKWebView because the webview is already below the status bar, so
// we use a hardcoded 48px on the fullScreen variant and additionally
// honour env() for any case where it actually has a value.
export const calendarDayDetail = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
  selectors: {
    '[data-full-screen="true"] &': {
      paddingTop: 'max(48px, env(safe-area-inset-top, 0px))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    },
  },
});

export const calendarDayDetailHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 12px 12px 8px',
  borderBottom: `1px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const calendarDayDetailBack = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: 'none',
  background: 'none',
  borderRadius: 8,
  fontSize: 22,
  cursor: 'pointer',
  color: cssVarV2.text.primary,
  ':active': {
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});

export const calendarDayDetailTitle = style({
  flex: 1,
  fontSize: 18,
  fontWeight: 700,
  color: cssVarV2.text.primary,
});

export const calendarDayDetailBody = style({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '12px 4px',
  // Bigger font in the detail view so editing on mobile is comfortable.
  fontSize: 16,
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
  // align-items: flex-start so multi-line wrapped textareas don't
  // drag the checkbox down to the visual middle of the block.
  alignItems: 'flex-start',
  gap: 6,
  padding: '1px 2px',
  borderRadius: 3,
  minWidth: 0,
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
  // Hard-lock the size so flex layout can't stretch it horizontally.
  // Without this, some browsers expanded the native checkbox to fill
  // its row column.
  flex: '0 0 13px',
  width: 13,
  height: 13,
  minWidth: 13,
  maxWidth: 13,
  minHeight: 13,
  maxHeight: 13,
  marginTop: 3,
  cursor: 'pointer',
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
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: cssVarV2.text.primary,
  fontSize: 12,
  lineHeight: 1.35,
  padding: '1px 2px',
  fontFamily: 'inherit',
  // textarea-specific: kill the native resize handle, hide the
  // scrollbar (the JS layout effect grows the height to fit), and
  // wrap long words instead of clipping them out of the cell.
  resize: 'none',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  display: 'block',
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

// ── Slash command popup ─────────────────────────────────────
// Rendered through a portal to document.body using position: fixed,
// so it can escape the calendar cell's `overflow: hidden`.
export const slashMenu = style({
  position: 'fixed',
  zIndex: 1000,
  minWidth: 200,
  maxWidth: 260,
  padding: 4,
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});

export const slashItem = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 1,
  padding: '6px 10px',
  borderRadius: 5,
  border: 'none',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  color: cssVarV2.text.primary,
  width: '100%',
});

export const slashItemActive = style({
  backgroundColor: cssVarV2.layer.background.hoverOverlay,
});

export const slashItemLabel = style({
  fontSize: 13,
  fontWeight: 500,
  color: cssVarV2.text.primary,
});

export const slashItemDesc = style({
  fontSize: 11,
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

// ── Habits panel — refreshed ─────────────────────────────────
// Same fixed mobile top-padding story as the calendar; env() is 0
// inside Capacitor's webview so we hardcode 48px on the fullScreen
// variant and additionally honour env() where it has a real value.
export const habitsModalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  paddingLeft: 8,
  paddingRight: 8,
  paddingTop: 4,
  paddingBottom: 8,
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  selectors: {
    '[data-full-screen="true"] &': {
      paddingTop: 'max(48px, env(safe-area-inset-top, 0px))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    },
  },
});

export const habitsAddCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
});

export const habitsAddCardTitle = style({
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: cssVarV2.text.tertiary,
});

export const habitsAddCardRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
});

export const habitsAddCardInput = style({
  flex: '1 1 200px',
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 15,
  outline: 'none',
  ':focus': {
    borderColor: cssVarV2.button.primary,
  },
});

export const habitsAddCardSelect = style({
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
});

export const habitsAddCardNumber = style({
  width: 80,
  height: 40,
  padding: '0 10px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 15,
  outline: 'none',
  textAlign: 'center',
});

export const habitsAddCardButton = style({
  height: 40,
  padding: '0 22px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: cssVarV2.button.primary,
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  ':hover': {
    opacity: 0.92,
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const habitsList = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '4px 0 8px 0',
});

export const habitsEmpty = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '48px 16px',
  color: cssVarV2.text.secondary,
  fontSize: 15,
  textAlign: 'center',
});

export const habitsEmptyEmoji = style({
  fontSize: 32,
  marginBottom: 4,
});

export const habitCard = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 14,
  padding: 14,
  borderRadius: 12,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  transition: 'border-color 0.15s, transform 0.05s',
  ':hover': {
    borderColor: cssVarV2.button.primary,
  },
});

export const habitCardChecked = style({
  backgroundColor: cssVarV2.layer.background.secondary,
});

export const habitCardCheckbox = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  margin: 0,
  width: 28,
  height: 28,
  minWidth: 28,
  cursor: 'pointer',
  border: `2px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  borderRadius: 8,
  transition: 'background-color 0.15s, border-color 0.15s',
  ':hover': {
    borderColor: cssVarV2.button.primary,
  },
});

globalStyle(`${habitCardCheckbox}:checked`, {
  backgroundColor: cssVarV2.button.primary,
  borderColor: cssVarV2.button.primary,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-6' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundSize: '80% 80%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

export const habitCardBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
});

export const habitCardName = style({
  // Used as a <button> in read mode so the user can click the name
  // to enter inline edit. We strip every browser-default button
  // affordance so it visually matches the previous static row.
  display: 'block',
  width: '100%',
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'text',
  fontFamily: 'inherit',
  fontSize: 17,
  fontWeight: 600,
  color: cssVarV2.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  ':hover': {
    color: cssVarV2.button.primary,
  },
});

export const habitCardNameInput = style({
  display: 'block',
  width: '100%',
  padding: '4px 8px',
  margin: 0,
  border: `1px solid ${cssVarV2.button.primary}`,
  borderRadius: 6,
  background: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontFamily: 'inherit',
  fontSize: 17,
  fontWeight: 600,
  outline: 'none',
});

export const habitCardMeta = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  fontSize: 13,
  color: cssVarV2.text.secondary,
});

export const habitCardStreak = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 999,
  backgroundColor: '#fff3a0',
  color: '#7a5d00',
  fontSize: 13,
  fontWeight: 700,
});

export const habitCardCounter = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 13,
  color: cssVarV2.text.secondary,
});

export const habitCardReset = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  color: cssVarV2.text.tertiary,
});

export const habitCardDelete = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: 'none',
  background: 'transparent',
  borderRadius: 8,
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  color: cssVarV2.text.tertiary,
  ':hover': {
    color: '#d93025',
    backgroundColor: cssVarV2.layer.background.hoverOverlay,
  },
});
