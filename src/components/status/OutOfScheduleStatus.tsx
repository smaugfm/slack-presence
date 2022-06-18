import React from 'react';
import { Box } from '@mui/material';
import { useRelativeDateTime } from '../hooks/useRelativeDateTime';

type Props = {
  start?: Date;
};

export function OutOfScheduleStatus(props: Props) {
  const relativeTime = useRelativeDateTime(props.start);
  if (props.start) {
    return (
      <Box>
        Slack presence is turned off. It will automatically turn on <b>{relativeTime}</b>{' '}
        and you will start to appear as active.
      </Box>
    );
  } else {
    return <Box>Slack presence is turned off</Box>;
  }
}
