import { Modal } from '@affine/component';
import { FirePanelIcon, ResetIcon } from '@blocksuite/icons/rc';
import { useCallback, useState } from 'react';

import * as styles from './styles.css';
import type { ResetInterval } from './types';
import { getDaysSinceCreation, getStreak, useHabits } from './use-habits';

function resetLabel(r: ResetInterval): string {
  switch (r.type) {
    case 'daily':
      return 'Daily (00:00)';
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
    <Modal open={open} onOpenChange={onOpenChange} title="Habits" width={480}>
      <div className={styles.modalContent}>
        {/* Add habit form */}
        <div className={styles.addForm}>
          <div className={styles.addFormInputs}>
            <div className={styles.formRow}>
              <input
                className={styles.formInput}
                placeholder="New habit name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Reset</span>
              <select
                className={styles.formSelect}
                value={resetType}
                onChange={e =>
                  setResetType(e.target.value as 'daily' | 'hours' | 'days')
                }
              >
                <option value="daily">Daily (00:00)</option>
                <option value="hours">Every N hours</option>
                <option value="days">Every N days</option>
              </select>
              {resetType !== 'daily' && (
                <input
                  type="number"
                  className={styles.numberInput}
                  min={1}
                  max={365}
                  value={resetValue}
                  onChange={e =>
                    setResetValue(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              )}
            </div>
          </div>
          <button
            className={styles.addButton}
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            Add
          </button>
        </div>

        {/* Habit list */}
        {habits.length === 0 ? (
          <div className={styles.emptyMessage}>
            No habits yet. Add one above to get started!
          </div>
        ) : (
          <div className={styles.habitList}>
            {habits.map(habit => {
              const streak = getStreak(habit);
              const totalDays = getDaysSinceCreation(habit);
              return (
                <div key={habit.id} className={styles.habitItem}>
                  <input
                    type="checkbox"
                    className={styles.habitCheckbox}
                    checked={habit.checked}
                    onChange={() => toggleHabit(habit.id)}
                  />
                  <div className={styles.habitInfo}>
                    <div className={styles.habitName}>{habit.name}</div>
                    <div className={styles.habitMeta}>
                      <span className={styles.streakBadge}>
                        <FirePanelIcon style={{ width: 12, height: 12 }} />
                        {streak.current} streak
                      </span>
                      <span>
                        {habit.completedDates.length}/{totalDays}
                      </span>
                      <span className={styles.resetLabel}>
                        <ResetIcon
                          style={{
                            width: 10,
                            height: 10,
                            verticalAlign: 'middle',
                            marginRight: 2,
                          }}
                        />
                        {resetLabel(habit.resetInterval)}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => removeHabit(habit.id)}
                    title="Remove habit"
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
