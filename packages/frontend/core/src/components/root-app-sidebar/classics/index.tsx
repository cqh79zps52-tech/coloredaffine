import { MenuItem } from '@affine/core/modules/app-sidebar/views';
import {
  CalendarPanelIcon,
  CheckBoxCheckLinearIcon,
} from '@blocksuite/icons/rc';
import { useCallback, useState } from 'react';

import { CalendarPanel } from './calendar-panel';
import { HabitsPanel } from './habits-panel';

export const HabitsButton = () => {
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);

  return (
    <>
      <MenuItem icon={<CheckBoxCheckLinearIcon />} onClick={handleClick}>
        <span>Habits</span>
      </MenuItem>
      <HabitsPanel open={open} onOpenChange={setOpen} />
    </>
  );
};

export const CalendarButton = () => {
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);

  return (
    <>
      <MenuItem icon={<CalendarPanelIcon />} onClick={handleClick}>
        <span>Calendar</span>
      </MenuItem>
      <CalendarPanel open={open} onOpenChange={setOpen} />
    </>
  );
};
