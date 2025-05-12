import React, { useMemo } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import {
  AppBar,
  Container,
  createTheme,
  CssBaseline,
  ThemeProvider,
  Toolbar,
} from '@mui/material';
import { css, Global } from '@emotion/react';
import { H6 } from './components/common/typography';
import { SettingsCard } from './components/settings/SettingsCard';
import { StatusCard } from './components/status/StatusCard';
import { ServerContext } from './components/context';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const t = useMemo(() => createTheme({}), []);

  const globalStyles = css`
    html,
    body {
      overflow-x: hidden;
      margin: 0;
      border: 0;
      padding: 0;
      background: ${t.palette.background.paper};
    }
  `;

  return (
    <ThemeProvider theme={t}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Global styles={globalStyles} />
        <AppBar
          position='absolute'
          color='default'
          elevation={0}
          css={css`
            position: relative;
            border-bottom: 1px solid ${t.palette.divider};
          `}
        >
          <Toolbar>
            <H6 color='inherit' fontWeight='normal' noWrap>
              Slack presence
            </H6>
          </Toolbar>
        </AppBar>
        <ServerContext>
          <Container component='main' maxWidth='sm' sx={{ p: { xs: 3, md: 6 } }}>
            <StatusCard />
            <SettingsCard />
          </Container>
        </ServerContext>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
