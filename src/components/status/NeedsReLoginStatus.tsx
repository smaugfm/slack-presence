import React from 'react';
import { Column } from '../common/layout';
import { Body1 } from '../common/typography';
import { Link } from '@mui/material';

export function NeedsReLoginStatus() {
  return (
    <Column sx={{ alignItems: 'center' }}>
      <Body1>
        Slack Presence couldn't load your Slack workspace. Most likely, your Slack{' '}
        <b>login session has expired</b> and you have to re-login manually.
        <br />
        <br />
        Ensure you have Chome browser installed and follow the instructions{' '}
        <Link
          target={'_blank'}
          href={
            'https://github.com/smaugfm/slack-presence?tab=readme-ov-file#manual-log-in'
          }
        >
          here
        </Link>
        .
      </Body1>
    </Column>
  );
}
