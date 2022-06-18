import React from 'react';
import { SettingsLayout } from './SettingsLayout';
import { MainCard } from '../common/MainCard';
import { H6 } from '../common/typography';
import { useSettings } from '../context';

export function SettingsCard() {
  const [settings, onChangeSetting] = useSettings();

  return (
    <MainCard title='Settings'>
      {settings ? (
        <SettingsLayout settings={settings} onChangeSetting={onChangeSetting} />
      ) : (
        <H6 align='center'>Failed to reach Slack presence server</H6>
      )}
    </MainCard>
  );
}
