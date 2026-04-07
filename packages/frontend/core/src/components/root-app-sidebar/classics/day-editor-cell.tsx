/**
 * A single calendar day rendered as a self-contained mini editor.
 *
 * Compared to the previous incarnation of this file, the body is no
 * longer a real BlockSuite editor. We now use the in-house `MiniEditor`
 * (see `mini-editor.tsx`), which is a few hundred lines of plain React
 * inputs. Benefits over the BlockSuite-backed version:
 *
 *   - Every cell can be edited at the same time. The "only one active
 *     cell" hack and its retry-error-boundary are gone.
 *   - No lazy import, no Suspense fallback flicker, no doc lifecycle
 *     to manage, no globals to fight over.
 *   - Cells render instantly because we don't spin up a workspace doc
 *     scope per day.
 */
import { useCallback } from 'react';

import { MiniEditor } from './mini-editor';
import type { MiniBlock } from './types';
import { useCalendarDocs } from './use-calendar-docs';

interface DayEditorCellBodyProps {
  date: string;
}

export const DayEditorCellBody = ({ date }: DayEditorCellBodyProps) => {
  const { getBlocks, setBlocks } = useCalendarDocs();
  const blocks = getBlocks(date);

  const handleChange = useCallback(
    (next: MiniBlock[]) => {
      setBlocks(date, next);
    },
    [date, setBlocks]
  );

  return (
    <MiniEditor
      value={blocks}
      onChange={handleChange}
      placeholder="Click to write…"
    />
  );
};
