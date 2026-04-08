/**
 * Mobile entry point for the desktop "Utils" sidebar (Habits + Calendar).
 *
 * The desktop sidebar lives in
 * `core/src/components/root-app-sidebar/classics/` and renders the two
 * features inline. On mobile we just need a discoverable trigger row
 * for each, because the panels themselves are already implemented as
 * self-contained `<Modal>`s — we can mount them as-is and they work on
 * any screen width.
 */
import { CalendarPanel } from '@affine/core/components/root-app-sidebar/classics/calendar-panel';
import { HabitsPanel } from '@affine/core/components/root-app-sidebar/classics/habits-panel';
import {
  CalendarPanelIcon,
  CheckBoxCheckLinearIcon,
} from '@blocksuite/icons/rc';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import * as styles from './styles.css';

interface UtilsRowProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

const UtilsRow = ({ icon, label, onClick }: UtilsRowProps) => (
  <button type="button" className={styles.utilsRow} onClick={onClick}>
    <span className={styles.utilsRowIcon}>{icon}</span>
    <span className={styles.utilsRowLabel}>{label}</span>
  </button>
);

export const NavigationPanelUtils = () => {
  const path = useMemo(() => ['utils'], []);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const openHabits = useCallback(() => setHabitsOpen(true), []);
  const openCalendar = useCallback(() => setCalendarOpen(true), []);

  return (
    <CollapsibleSection
      path={path}
      title="Utils"
      testId="navigation-panel-utils"
      headerTestId="navigation-panel-utils-category-divider"
    >
      <div className={styles.utilsList}>
        <UtilsRow
          icon={<CheckBoxCheckLinearIcon />}
          label="Habits"
          onClick={openHabits}
        />
        <UtilsRow
          icon={<CalendarPanelIcon />}
          label="Calendar"
          onClick={openCalendar}
        />
      </div>
      <HabitsPanel open={habitsOpen} onOpenChange={setHabitsOpen} />
      <CalendarPanel open={calendarOpen} onOpenChange={setCalendarOpen} />
    </CollapsibleSection>
  );
};
