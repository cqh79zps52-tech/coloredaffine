import { SafeArea, useThemeColorV2 } from '@affine/component';

import { AppTabs } from '../../components';
import {
  NavigationPanelOrganize,
  NavigationPanelUtils,
} from '../../components/navigation';
import { HomeHeader, RecentDocs } from '../../views';

export const Component = () => {
  useThemeColorV2('layer/background/mobile/primary');

  return (
    <>
      <HomeHeader />
      <RecentDocs />
      <SafeArea bottom>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            padding: '0 8px 32px 8px',
          }}
        >
          <NavigationPanelOrganize />
          <NavigationPanelUtils />
        </div>
      </SafeArea>
      <AppTabs />
    </>
  );
};
