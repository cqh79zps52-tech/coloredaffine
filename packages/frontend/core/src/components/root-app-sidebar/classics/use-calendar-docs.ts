import { DocsService } from '@affine/core/modules/doc';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';

import type { CalendarDay } from './types';

const Y_MAP_KEY = 'affine-classics-calendar';
const LEGACY_LS_KEY = 'affine-classics-calendar';
const LS_MIGRATED_FLAG = 'affine-classics-calendar-migrated';

function readAll(yMap: Y.Map<CalendarDay>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [date, day] of yMap.entries()) {
    if (day && typeof day === 'object' && typeof day.docId === 'string') {
      result.set(date, day.docId);
    }
  }
  return result;
}

/**
 * One-shot cleanup of the legacy `localStorage` payload. The old format
 * stored ad-hoc todos per day; we no longer use that — each day now maps
 * to a real workspace doc — so we just discard the legacy data.
 */
function clearLegacyLocalStorageIfNeeded() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_FLAG)) return;
  localStorage.setItem(LS_MIGRATED_FLAG, '1');
  localStorage.removeItem(LEGACY_LS_KEY);
}

/**
 * Calendar storage: each day maps to a workspace doc id. Docs are
 * created lazily the first time a day is opened.
 */
export function useCalendarDocs() {
  const workspaceService = useService(WorkspaceService);
  const docsService = useService(DocsService);

  const yMap = useMemo(
    () => workspaceService.workspace.rootYDoc.getMap<CalendarDay>(Y_MAP_KEY),
    [workspaceService]
  );

  const [dateToDocId, setDateToDocId] = useState<Map<string, string>>(() => {
    clearLegacyLocalStorageIfNeeded();
    return readAll(yMap);
  });

  useEffect(() => {
    clearLegacyLocalStorageIfNeeded();
    setDateToDocId(readAll(yMap));
  }, [yMap]);

  useEffect(() => {
    const onChange = () => setDateToDocId(readAll(yMap));
    yMap.observe(onChange);
    return () => yMap.unobserve(onChange);
  }, [yMap]);

  const getDocId = useCallback(
    (date: string): string | undefined => {
      return dateToDocId.get(date);
    },
    [dateToDocId]
  );

  /**
   * Returns the doc id for the given day, creating it on demand. The
   * doc's title is set to the date so it's easy to find from search.
   */
  const ensureDocForDate = useCallback(
    (date: string): string => {
      const existing = yMap.get(date);
      if (existing && typeof existing.docId === 'string') {
        // Defensive: make sure the doc still exists in the workspace.
        const stillExists = docsService.list.doc$(existing.docId).value;
        if (stillExists) return existing.docId;
      }
      const doc = docsService.createDoc({
        title: date,
        primaryMode: 'page',
      });
      yMap.set(date, { date, docId: doc.id });
      return doc.id;
    },
    [yMap, docsService]
  );

  return { getDocId, ensureDocForDate };
}
