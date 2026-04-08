import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';

import type { Habit, ResetInterval } from './types';

const Y_MAP_KEY = 'affine-classics-habits';
const LEGACY_LS_KEY = 'affine-classics-habits';
const LS_MIGRATED_FLAG = 'affine-classics-habits-migrated';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shouldReset(habit: Habit): boolean {
  const now = Date.now();
  const { resetInterval, lastReset } = habit;

  switch (resetInterval.type) {
    case 'daily': {
      const lastResetDate = new Date(lastReset).toISOString().slice(0, 10);
      return lastResetDate !== todayStr();
    }
    case 'hours':
      return now - lastReset >= resetInterval.value * 3600_000;
    case 'days':
      return now - lastReset >= resetInterval.value * 86400_000;
  }
}

function readAll(yMap: Y.Map<Habit>): Habit[] {
  return Array.from(yMap.values());
}

/**
 * One-shot migration of legacy `localStorage`-stored habits into the
 * first workspace the user opens after the upgrade. Subsequent workspaces
 * start empty.
 */
function migrateFromLocalStorageIfNeeded(yMap: Y.Map<Habit>) {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_FLAG)) return;
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw && yMap.size === 0) {
      const arr = JSON.parse(raw) as Habit[];
      const doc = yMap.doc;
      const apply = () => {
        for (const h of arr) {
          if (h && typeof h.id === 'string') yMap.set(h.id, h);
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

/**
 * Roll forward any habits whose reset window has elapsed. Writes back into
 * the Y.Map inside a single transaction so observers see one update.
 */
function runResetsAndPersist(yMap: Y.Map<Habit>) {
  const now = Date.now();
  const resets: Habit[] = [];
  for (const h of yMap.values()) {
    if (h.checked && shouldReset(h)) {
      resets.push({ ...h, checked: false, lastReset: now });
    }
  }
  if (resets.length === 0) return;
  const doc = yMap.doc;
  const apply = () => {
    for (const h of resets) yMap.set(h.id, h);
  };
  if (doc) doc.transact(apply);
  else apply();
}

export function getStreak(habit: Habit): { current: number; total: number } {
  const total = habit.completedDates.length;
  if (total === 0) return { current: 0, total: 0 };

  // Sort dates descending
  const sorted = [...habit.completedDates].sort().reverse();
  let current = 0;
  const today = todayStr();
  const checkDate = new Date(today);

  for (const dateStr of sorted) {
    const expected = checkDate.toISOString().slice(0, 10);
    if (dateStr === expected) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (
      current === 0 &&
      dateStr ===
        new Date(checkDate.getTime() - 86400_000).toISOString().slice(0, 10)
    ) {
      // Allow starting from yesterday if today isn't done yet
      checkDate.setDate(checkDate.getDate() - 1);
      const retryExpected = checkDate.toISOString().slice(0, 10);
      if (dateStr === retryExpected) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return { current, total };
}

export function getDaysSinceCreation(habit: Habit): number {
  const created = new Date(habit.createdAt).toISOString().slice(0, 10);
  const today = todayStr();
  const diff = new Date(today).getTime() - new Date(created).getTime();
  return Math.floor(diff / 86400_000) + 1;
}

export function useHabits() {
  const workspaceService = useService(WorkspaceService);
  const yMap = useMemo(
    () => workspaceService.workspace.rootYDoc.getMap<Habit>(Y_MAP_KEY),
    [workspaceService]
  );

  const [habits, setHabits] = useState<Habit[]>(() => {
    migrateFromLocalStorageIfNeeded(yMap);
    runResetsAndPersist(yMap);
    return readAll(yMap);
  });

  // Re-sync if the workspace switches under us.
  useEffect(() => {
    migrateFromLocalStorageIfNeeded(yMap);
    runResetsAndPersist(yMap);
    setHabits(readAll(yMap));
  }, [yMap]);

  // Reactively follow Y.Map mutations (local + remote/sync).
  useEffect(() => {
    const onChange = () => setHabits(readAll(yMap));
    yMap.observe(onChange);
    return () => yMap.unobserve(onChange);
  }, [yMap]);

  // Periodically check for reset windows elapsing while the app is open.
  useEffect(() => {
    const interval = setInterval(() => {
      runResetsAndPersist(yMap);
    }, 60_000);
    return () => clearInterval(interval);
  }, [yMap]);

  const addHabit = useCallback(
    (name: string, resetInterval: ResetInterval) => {
      const habit: Habit = {
        id: generateId(),
        name,
        resetInterval,
        createdAt: Date.now(),
        completedDates: [],
        lastReset: Date.now(),
        checked: false,
      };
      yMap.set(habit.id, habit);
    },
    [yMap]
  );

  const toggleHabit = useCallback(
    (id: string) => {
      const h = yMap.get(id);
      if (!h) return;
      const today = todayStr();
      const newChecked = !h.checked;
      const completedDates = newChecked
        ? h.completedDates.includes(today)
          ? h.completedDates
          : [...h.completedDates, today]
        : h.completedDates.filter(d => d !== today);
      yMap.set(id, { ...h, checked: newChecked, completedDates });
    },
    [yMap]
  );

  const removeHabit = useCallback(
    (id: string) => {
      yMap.delete(id);
    },
    [yMap]
  );

  const renameHabit = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const h = yMap.get(id);
      if (!h) return;
      if (h.name === trimmed) return;
      yMap.set(id, { ...h, name: trimmed });
    },
    [yMap]
  );

  return { habits, addHabit, toggleHabit, removeHabit, renameHabit };
}
