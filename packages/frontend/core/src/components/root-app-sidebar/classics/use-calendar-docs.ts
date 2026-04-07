/**
 * Storage layer for the calendar mini-editor.
 *
 * Each day's content is a small array of `MiniBlock`s persisted directly
 * inside the workspace root Y.Doc. We deliberately do *not* create a
 * full workspace doc per day any more — that approach mounted a real
 * BlockSuite editor inside every cell, which was both heavy and racy
 * (multiple editors fighting over `globalThis.currentEditor`). Storing
 * the blocks ourselves keeps each cell to a few React inputs and lets
 * any number of cells be edited at the same time.
 *
 * The Y.Map values are plain JSON; conflict resolution is last-write-
 * wins per day. That's fine for the personal-notes use case the
 * calendar is built for.
 */
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';

import type { CalendarDay, MiniBlock } from './types';

const Y_MAP_KEY = 'affine-classics-calendar-v2';
const LEGACY_LS_KEY = 'affine-classics-calendar';
const LS_MIGRATED_FLAG = 'affine-classics-calendar-migrated';

function readAll(yMap: Y.Map<CalendarDay>): Map<string, MiniBlock[]> {
  const result = new Map<string, MiniBlock[]>();
  for (const [date, day] of yMap.entries()) {
    if (
      day &&
      typeof day === 'object' &&
      typeof day.date === 'string' &&
      Array.isArray(day.blocks)
    ) {
      result.set(date, day.blocks);
    }
  }
  return result;
}

/**
 * One-shot cleanup of the legacy `localStorage` payload from the very
 * first iteration of this feature. Old per-day workspace docs created
 * by the previous (BlockSuite-backed) implementation are intentionally
 * left in place — they're harmless and the user may still want to
 * reach them through the regular sidebar.
 */
function clearLegacyLocalStorageIfNeeded() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_FLAG)) return;
  localStorage.setItem(LS_MIGRATED_FLAG, '1');
  localStorage.removeItem(LEGACY_LS_KEY);
}

export interface UseCalendarDocsResult {
  /** Returns the blocks for a given day, or an empty array if none. */
  getBlocks: (date: string) => MiniBlock[];
  /** Persists the blocks for a given day. */
  setBlocks: (date: string, blocks: MiniBlock[]) => void;
  /** True if at least one non-empty block exists for the given day. */
  hasContent: (date: string) => boolean;
}

export function useCalendarDocs(): UseCalendarDocsResult {
  const workspaceService = useService(WorkspaceService);

  const yMap = useMemo(
    () => workspaceService.workspace.rootYDoc.getMap<CalendarDay>(Y_MAP_KEY),
    [workspaceService]
  );

  const [snapshot, setSnapshot] = useState<Map<string, MiniBlock[]>>(() => {
    clearLegacyLocalStorageIfNeeded();
    return readAll(yMap);
  });

  useEffect(() => {
    clearLegacyLocalStorageIfNeeded();
    setSnapshot(readAll(yMap));
  }, [yMap]);

  useEffect(() => {
    const onChange = () => setSnapshot(readAll(yMap));
    yMap.observe(onChange);
    return () => yMap.unobserve(onChange);
  }, [yMap]);

  const getBlocks = useCallback(
    (date: string): MiniBlock[] => snapshot.get(date) ?? [],
    [snapshot]
  );

  const hasContent = useCallback(
    (date: string): boolean => {
      const blocks = snapshot.get(date);
      if (!blocks || blocks.length === 0) return false;
      return blocks.some(b => b.text.trim().length > 0);
    },
    [snapshot]
  );

  const setBlocks = useCallback(
    (date: string, blocks: MiniBlock[]) => {
      // Only delete the entry when the day has nothing meaningful in
      // it at all. We deliberately do *not* trim trailing empty
      // paragraphs any more — that broke the user-facing "demote a
      // todo back to text" gesture: when the editor demoted an empty
      // todo to an empty paragraph, we'd silently strip it from
      // storage, the textarea unmounted, and focus jumped away.
      // Keeping the empty paragraph around lets the user actually
      // *land* on it before the next backspace merges into the line
      // above, which is the two-step Backspace dance every other note
      // editor uses.
      const allEmpty = blocks.every(b => b.type === 'p' && b.text === '');
      if (blocks.length === 0 || allEmpty) {
        yMap.delete(date);
        return;
      }
      yMap.set(date, { date, blocks });
    },
    [yMap]
  );

  return { getBlocks, setBlocks, hasContent };
}
