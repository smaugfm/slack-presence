import React, { useCallback, useEffect, useState } from 'react';
import { renderTimeViewClock, TimePicker } from '@mui/x-date-pickers';
import { Switch, TextField } from '@mui/material';
import { useLink } from 'valuelink';
import { Column, Row } from '../common/layout';
import { formatDate, isUrlValid, parseDate, Settings } from '../../common/common';
import { useDebouncedCallback } from 'use-debounce';
import { Body1 } from '../common/typography';

type Props = {
  settings: Settings;
  onChangeSetting: <T extends keyof Settings>(
    key: T,
    value: Settings[T],
  ) => Promise<void>;
};

export function SettingsLayout({ settings, onChangeSetting }: Props) {
  const [localSettings, setLocalSettings] = useState(settings);
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  const slackUrlState = useLink(settings).at('slackUrl');
  slackUrlState.check(x => isUrlValid(x), 'Must be a valid Slack workspace URL');

  const debouncedOnChangeSetting = useDebouncedCallback(
    onChangeSetting,
    500,
  ) as Props['onChangeSetting'];

  const changeLocalSetting = useCallback(
    <T extends keyof Settings>(key: T, value: Settings[T]) => {
      setLocalSettings(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const handleChange = useCallback(
    <T extends keyof Settings>(key: T) => {
      return async (value: Settings[T]) => {
        if (key === 'slackUrl') slackUrlState.props.onChange({ target: { value } });
        else changeLocalSetting(key, value);

        if (!slackUrlState.error) await debouncedOnChangeSetting(key, value);
      };
    },
    [
      changeLocalSetting,
      debouncedOnChangeSetting,
      slackUrlState.error,
      slackUrlState.props,
    ],
  );

  return (
    <Column sx={{ gap: { md: 4, xs: 3 } }}>
      <Row justifyContent='space-between'>
        <Column>
          <Body1>Slack presence</Body1>
          <Body1 color='textSecondary'>
            {localSettings.enabled ? 'Enabled' : 'Disabled'}
          </Body1>
        </Column>
        <Switch
          disabled={!!slackUrlState.error && !localSettings.enabled}
          checked={localSettings.enabled}
          onChange={(e, x) => handleChange('enabled')(x)}
        />
      </Row>
      <TextField
        required
        sx={{ mb: -2 }}
        name='Workspace URL'
        label='Workspace URL'
        fullWidth
        error={!!slackUrlState.error}
        helperText={slackUrlState.error ?? ' '}
        value={slackUrlState.props.value}
        onChange={e => handleChange('slackUrl')(e.target.value)}
        placeholder='https://workspace.slack.com'
        variant='outlined'
      />
      <Row sx={{ justifyContent: 'space-between' }}>
        <TimePicker
          label='Start time'
          value={parseDate(localSettings.start)}
          onChange={v => handleChange('start')(v ? formatDate(v) : undefined)}
          ampm={false}
          ampmInClock={false}
          viewRenderers={{
            hours: renderTimeViewClock,
            minutes: renderTimeViewClock,
            seconds: renderTimeViewClock,
          }}
          slotProps={{
            textField: {
              sx: { flex: 1, mr: 2 },
              fullWidth: true,
            },
          }}
        />

        <TimePicker
          label='End time'
          value={parseDate(localSettings.end)}
          onChange={v => handleChange('end')(v ? formatDate(v) : undefined)}
          ampm={false}
          ampmInClock={false}
          viewRenderers={{
            hours: renderTimeViewClock,
            minutes: renderTimeViewClock,
            seconds: renderTimeViewClock,
          }}
          slotProps={{
            textField: {
              sx: { flex: 1 },
              fullWidth: true,
            },
          }}
        />
      </Row>
    </Column>
  );
}
