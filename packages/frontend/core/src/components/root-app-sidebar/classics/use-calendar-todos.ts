import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';

import type { CalendarDay, CalendarTodo } from './types';

const Y_MAP_KEY = 'affine-classics-calendar';
const LEGACY_LS_KEY = 'affine-classics-calendar';
const LS_MIGRATED_FLAG = 'affine-classics-calendar-migrated';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readAll(yMap: Y.Map<CalendarDay>): CalendarDay[] {
  return Array.from(yMap.values());
}

/**
 * One-shot migration of legacy `localStorage`-stored calendar todos into
 * the first workspace the user opens after the upgrade.
 */
function migrateFromLocalStorageIfNeeded(yMap: Y.Map<CalendarDay>) {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_FLAG)) return;
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw && yMap.size === 0) {
      const arr = JSON.parse(raw) as CalendarDay[];
      const doc = yMap.doc;
      const apply = () => {
        for (const d of arr) {
          if (d && typeof d.date === 'string') yMap.set(d.date, d);
        }
      };
      if (doc) doc.transact(apply);
      else apply();
    }
  } catch {
    // ignore corrupt legacy payloads
  }
  localStorage.setItem(LS_MIGRATED_FLAG, '1');
  localStorage.removeItem(LEGACY_LS_KEY);
}

export function useCalendarTodos() {
  const workspaceService = useService(WorkspaceService);
  const yMap = useMemo(
    () => workspaceService.workspace.rootYDoc.getMap<CalendarDay>(Y_MAP_KEY),
    [workspaceService]
  );

  const [days, setDays] = useState<CalendarDay[]>(() => {
    migrateFromLocalStorageIfNeeded(yMap);
    return readAll(yMap);
  });

  // Re-sync if the workspace switches under us.
  useEffect(() => {
    migrateFromLocalStorageIfNeeded(yMap);
    setDays(readAll(yMap));
  }, [yMap]);

  // Reactively follow Y.Map mutations (local + remote/sync).
  useEffect(() => {
    const onChange = () => setDays(readAll(yMap));
    yMap.observe(onChange);
    return () => yMap.unobserve(onChange);
  }, [yMap]);

  const getTodos = useCallback(
    (date: string): CalendarTodo[] => {
      return days.find(d => d.date === date)?.todos ?? [];
    },
    [days]
  );

  const addTodo = useCallback(
    (date: string, text: string) => {
      const newTodo: CalendarTodo = { id: generateId(), text, done: false };
      const existing = yMap.get(date);
      if (existing) {
        yMap.set(date, { ...existing, todos: [...existing.todos, newTodo] });
      } else {
        yMap.set(date, { date, todos: [newTodo] });
      }
    },
    [yMap]
  );

  const toggleTodo = useCallback(
    (date: string, todoId: string) => {
      const existing = yMap.get(date);
      if (!existing) return;
      yMap.set(date, {
        ...existing,
        todos: existing.todos.map(t =>
          t.id === todoId ? { ...t, done: !t.done } : t
        ),
      });
    },
    [yMap]
  );

  const removeTodo = useCallback(
    (date: string, todoId: string) => {
      const existing = yMap.get(date);
      if (!existing) return;
      const nextTodos = existing.todos.filter(t => t.id !== todoId);
      if (nextTodos.length === 0) {
        yMap.delete(date);
      } else {
        yMap.set(date, { ...existing, todos: nextTodos });
      }
    },
    [yMap]
  );

  const getDayCount = useCallback(
    (date: string): number => {
      return days.find(d => d.date === date)?.todos.length ?? 0;
    },
    [days]
  );

  return { days, getTodos, addTodo, toggleTodo, removeTodo, getDayCount };
}
