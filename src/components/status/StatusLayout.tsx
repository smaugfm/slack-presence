import React from 'react';
import { MainCard } from '../common/MainCard';
import { ActiveStatus } from './ActiveStatus';
import { NeedsReLoginStatus } from './NeedsReLoginStatus';
import { OutOfScheduleStatus } from './OutOfScheduleStatus';
import { PresenceStatus } from '../../common/common';
import { InactiveStatus } from './InactiveStatus';
import { LoadingStatus } from './LoadingStatus';
import { FailedToLoadStatus } from './FailedToLoadStatus';

type Props = {
  status: PresenceStatus;
};

export function StatusLayout({ status }: Props) {
  return (
    <MainCard title='Current presence status'>
      {status.status === 'active' ? (
        <ActiveStatus
          name={status.name}
          avatarUrl={status.avatarUrl}
          avatarUrl2x={status.avatarUrl2x}
          endTime={status.endISOTime ? new Date(status.endISOTime) : undefined}
        />
      ) : status.status === 'loading' ? (
        <LoadingStatus />
      ) : status.status === 'needsReLogin' ? (
        <NeedsReLoginStatus />
      ) : status.status === 'outOfSchedule' ? (
        <OutOfScheduleStatus
          start={status.startISOTime ? new Date(status.startISOTime) : undefined}
        />
      ) : status.status === 'inactive' ? (
        <InactiveStatus />
      ) : status.status === 'failedToLoad' ? (
        <FailedToLoadStatus />
      ) : (
        <></>
      )}
    </MainCard>
  );
}
