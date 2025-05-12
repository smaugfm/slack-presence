import React, { useState } from 'react';
import { Column } from '../common/layout';
import { Body1, Body2 } from '../common/typography';
import { Box, Button, Link, Modal } from '@mui/material';
import { css } from '@emotion/react';
import { ThirdPartyCookiesGuide } from '../other/ThirdPartyCookiesGuide';
import { HostnameIsNotIp } from '../other/HostnameIsNotIp';
import { dnsLookup, isDesktopChrome, isHostnameValidForDevtools } from '../common/other';
import { useAsync } from 'react-use';

type Props = {
  devtoolsUrl?: string;
};

export function NeedsReLoginStatus({ devtoolsUrl }: Props) {
  const [iframeOpen, setIframeOpen] = useState(false);
  const [thirdPartyGuide, setThirdPartyGuide] = useState(false);
  let devToolsUrlValid = isHostnameValidForDevtools(window.location.hostname);
  const dnsState = useAsync(() => dnsLookup(window.location.hostname));
  if (!devToolsUrlValid && !!devtoolsUrl && !dnsState.loading && !!dnsState.value) {
    const url = new URL(devtoolsUrl);
    url.hostname = dnsState.value;
    devtoolsUrl = url.toString();
    devToolsUrlValid = true;
  }
  const isChrome = isDesktopChrome();
  if (!isChrome) {
    devtoolsUrl = undefined;
  }

  return (
    <>
      {devToolsUrlValid ? (
        <Column sx={{ alignItems: 'center' }}>
          <Body1>
            Slack Presence couldn't load your Slack workspace. Most likely, your Slack
            Login session has expired and you have to re-login manually.
            {!isChrome &&
              <>
                <br />
                Please open this page in <b>Google Chrome</b> browser
              </>
            }
            {!!devtoolsUrl && (
              <>
                <br />
                Click the button below to open Slack presence internal browser and then
                login to your Slack workspace. When you are done enable Slack presence
                again.
              </>
            )}
          </Body1>
          {!!devtoolsUrl && (
            <>
              <Button
                disabled={!devtoolsUrl}
                sx={{ my: 2 }}
                fullWidth={false}
                variant='contained'
                onClick={() => setIframeOpen(true)}
              >
                Open browser
              </Button>
              <Body2>
                If you see a blank page you may have to enable third-party cookies. Click{' '}
                <Link href='#' onClick={() => setThirdPartyGuide(true)}>
                  here
                </Link>{' '}
                here to see how to do this.
              </Body2>
            </>
          )}
        </Column>
      ) : (
        <HostnameIsNotIp />
      )}
      <Modal open={iframeOpen} onClose={() => setIframeOpen(false)}>
        <Box
          sx={{
            position: 'absolute' as 'absolute',
            top: '50%',
            left: '50%',
            width: '80vw',
            height: '80vh',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 1,
          }}
        >
          <iframe
            title='Slack remote'
            css={css`
              width: 100%;
              height: 100%;
            `}
            src={devtoolsUrl}
          />
        </Box>
      </Modal>
      <ThirdPartyCookiesGuide
        open={thirdPartyGuide}
        onClose={() => setThirdPartyGuide(false)}
      />
    </>
  );
}
