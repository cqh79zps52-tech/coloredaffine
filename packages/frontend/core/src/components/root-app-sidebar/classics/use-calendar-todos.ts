import { useCallback, useState } from 'react';

import type { CalendarDay, CalendarTodo } from './types';

const STORAGE_KEY = 'affine-classics-calendar';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): CalendarDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarDay[];
  } catch {
    return [];
  }
}

function save(days: CalendarDay[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

export function useCalendarTodos() {
  const [days, setDays] = useState<CalendarDay[]>(load);

  const getTodos = useCallback(
    (date: string): CalendarTodo[] => {
      return days.find(d => d.date === date)?.todos ?? [];
    },
    [days]
  );

  const addTodo = useCallback((date: string, text: string) => {
    setDays(prev => {
      const existing = prev.find(d => d.date === date);
      const newTodo: CalendarTodo = { id: generateId(), text, done: false };
      let next: CalendarDay[];
      if (existing) {
        next = prev.map(d =>
          d.date === date ? { ...d, todos: [...d.todos, newTodo] } : d
        );
      } else {
        next = [...prev, { date, todos: [newTodo] }];
      }
      save(next);
      return next;
    });
  }, []);

  const toggleTodo = useCallback((date: string, todoId: string) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.date === date
          ? {
              ...d,
              todos: d.todos.map(t =>
                t.id === todoId ? { ...t, done: !t.done } : t
              ),
            }
          : d
      );
      save(next);
      return next;
    });
  }, []);

  const removeTodo = useCallback((date: string, todoId: string) => {
    setDays(prev => {
      const next = prev
        .map(d =>
          d.date === date
            ? { ...d, todos: d.todos.filter(t => t.id !== todoId) }
            : d
        )
        .filter(d => d.todos.length > 0);
      save(next);
      return next;
    });
  }, []);

  const getDayCount = useCallback(
    (date: string): number => {
      return days.find(d => d.date === date)?.todos.length ?? 0;
    },
    [days]
  );

  return { days, getTodos, addTodo, toggleTodo, removeTodo, getDayCount };
}
