import React from 'react';
import { StatusLayout } from './StatusLayout';
import { useStatus } from '../context';

export function StatusCard() {
  const status = useStatus();

  return <>{status && <StatusLayout status={status} />}</>;
}
