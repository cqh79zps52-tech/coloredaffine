import { Modal } from '@affine/component';
import { FirePanelIcon, ResetIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import * as styles from './styles.css';
import type { ResetInterval } from './types';
import { getDaysSinceCreation, getStreak, useHabits } from './use-habits';

function resetLabel(r: ResetInterval): string {
  switch (r.type) {
    case 'daily':
      return 'Daily • 00:00';
    case 'hours':
      return `Every ${r.value}h`;
    case 'days':
      return `Every ${r.value}d`;
  }
}

export const HabitsPanel = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { habits, addHabit, toggleHabit, removeHabit } = useHabits();

  const [name, setName] = useState('');
  const [resetType, setResetType] = useState<'daily' | 'hours' | 'days'>(
    'daily'
  );
  const [resetValue, setResetValue] = useState(1);

  const isMobile = BUILD_CONFIG.isMobileEdition;

  const handleAdd = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const interval: ResetInterval =
      resetType === 'daily'
        ? { type: 'daily' }
        : { type: resetType, value: resetValue };
    addHabit(trimmed, interval);
    setName('');
  }, [name, resetType, resetValue, addHabit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAdd();
    },
    [handleAdd]
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Habits"
      // The redesigned panel is markedly bigger than the legacy 480px
      // popover so the cards have room to breathe and the empty state
      // doesn't look like a tooltip. On mobile we use the full screen.
      width={isMobile ? undefined : 'min(96vw, 720px)'}
      height={isMobile ? undefined : 'min(90vh, 760px)'}
      fullScreen={isMobile}
    >
      <div className={styles.habitsModalContent}>
        {/* Add habit card */}
        <div className={styles.habitsAddCard}>
          <span className={styles.habitsAddCardTitle}>Add a new habit</span>
          <div className={styles.habitsAddCardRow}>
            <input
              className={styles.habitsAddCardInput}
              placeholder="What do you want to track?"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.habitsAddCardRow}>
            <select
              className={styles.habitsAddCardSelect}
              value={resetType}
              onChange={e =>
                setResetType(e.target.value as 'daily' | 'hours' | 'days')
              }
            >
              <option value="daily">Daily • resets at midnight</option>
              <option value="hours">Every N hours</option>
              <option value="days">Every N days</option>
            </select>
            {resetType !== 'daily' && (
              <input
                type="number"
                className={styles.habitsAddCardNumber}
                min={1}
                max={365}
                value={resetValue}
                onChange={e =>
                  setResetValue(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            )}
            <button
              type="button"
              className={styles.habitsAddCardButton}
              onClick={handleAdd}
              disabled={!name.trim()}
            >
              Add habit
            </button>
          </div>
        </div>

        {/* Habit list */}
        {habits.length === 0 ? (
          <div className={styles.habitsEmpty}>
            <span className={styles.habitsEmptyEmoji}>✨</span>
            <span>No habits yet.</span>
            <span>Add one above and start a streak.</span>
          </div>
        ) : (
          <div className={styles.habitsList}>
            {habits.map(habit => {
              const streak = getStreak(habit);
              const totalDays = getDaysSinceCreation(habit);
              return (
                <div
                  key={habit.id}
                  className={clsx(
                    styles.habitCard,
                    habit.checked && styles.habitCardChecked
                  )}
                >
                  <input
                    type="checkbox"
                    className={styles.habitCardCheckbox}
                    checked={habit.checked}
                    onChange={() => toggleHabit(habit.id)}
                    aria-label={`Mark ${habit.name} done`}
                  />
                  <div className={styles.habitCardBody}>
                    <div className={styles.habitCardName}>{habit.name}</div>
                    <div className={styles.habitCardMeta}>
                      <span className={styles.habitCardStreak}>
                        <FirePanelIcon style={{ width: 14, height: 14 }} />
                        {streak.current}-day streak
                      </span>
                      <span className={styles.habitCardCounter}>
                        ✓ {habit.completedDates.length} / {totalDays} days
                      </span>
                      <span className={styles.habitCardReset}>
                        <ResetIcon style={{ width: 12, height: 12 }} />
                        {resetLabel(habit.resetInterval)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.habitCardDelete}
                    onClick={() => removeHabit(habit.id)}
                    title="Remove habit"
                    aria-label={`Remove ${habit.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
