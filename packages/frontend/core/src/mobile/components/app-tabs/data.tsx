import { HomeIcon } from '@blocksuite/icons/rc';

import { AppTabCreate } from './create';
import type { Tab } from './type';

export const tabs: Tab[] = [
  {
    key: 'home',
    to: '/home',
    Icon: HomeIcon,
  },
  {
    key: 'new',
    custom: AppTabCreate,
  },
];
