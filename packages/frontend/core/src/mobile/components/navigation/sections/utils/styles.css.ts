import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const utilsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  paddingTop: 4,
});

export const utilsRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '12px 12px',
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  color: cssVar('textPrimaryColor'),
  fontSize: 16,
  textAlign: 'left',
  selectors: {
    '&:active': {
      background: cssVar('hoverColor'),
    },
  },
});

export const utilsRowIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  fontSize: 20,
  color: cssVar('iconColor'),
});

export const utilsRowLabel = style({
  flex: 1,
  fontWeight: 500,
});
