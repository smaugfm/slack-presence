import { Box } from '@mui/material';

export function FailedToLoadStatus() {
  return (
    <Box>
      Slack Presence failed to load your workspace. Please check that your workspace URL is
      correct
    </Box>
  );
}
