import { useCallback, useEffect, useState } from 'react';

import type { Habit, ResetInterval } from './types';

const STORAGE_KEY = 'affine-classics-habits';

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

function processResets(habits: Habit[]): Habit[] {
  const now = Date.now();
  let changed = false;
  const result = habits.map(h => {
    if (h.checked && shouldReset(h)) {
      changed = true;
      return { ...h, checked: false, lastReset: now };
    }
    return h;
  });
  return changed ? result : habits;
}

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return processResets(JSON.parse(raw) as Habit[]);
  } catch {
    return [];
  }
}

function save(habits: Habit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
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
  const [habits, setHabits] = useState<Habit[]>(load);

  // Periodically check for resets
  useEffect(() => {
    const interval = setInterval(() => {
      setHabits(prev => {
        const processed = processResets(prev);
        if (processed !== prev) {
          save(processed);
        }
        return processed;
      });
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const addHabit = useCallback((name: string, resetInterval: ResetInterval) => {
    setHabits(prev => {
      const newHabit: Habit = {
        id: generateId(),
        name,
        resetInterval,
        createdAt: Date.now(),
        completedDates: [],
        lastReset: Date.now(),
        checked: false,
      };
      const next = [...prev, newHabit];
      save(next);
      return next;
    });
  }, []);

  const toggleHabit = useCallback((id: string) => {
    setHabits(prev => {
      const next = prev.map(h => {
        if (h.id !== id) return h;
        const today = todayStr();
        const newChecked = !h.checked;
        const completedDates = newChecked
          ? h.completedDates.includes(today)
            ? h.completedDates
            : [...h.completedDates, today]
          : h.completedDates.filter(d => d !== today);
        return { ...h, checked: newChecked, completedDates };
      });
      save(next);
      return next;
    });
  }, []);

  const removeHabit = useCallback((id: string) => {
    setHabits(prev => {
      const next = prev.filter(h => h.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { habits, addHabit, toggleHabit, removeHabit };
}
