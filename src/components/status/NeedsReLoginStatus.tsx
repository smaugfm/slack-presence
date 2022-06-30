import React, { useState } from 'react';
import { Column } from '../common/layout';
import { Body1, Body2 } from '../common/typography';
import { Box, Link, Modal } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { css } from '@emotion/react';
import { ThirdPartyCookiesGuide } from '../other/ThirdPartyCookiesGuide';
import { useAsyncFn } from 'react-use';

type Props = {
  devtoolsUrl?: string;
};

function changeHostnameToLocationHostname(url: string | undefined) {
  if (!url) return undefined;

  return url.replaceAll(new URL(url).hostname, window.location.hostname);
}

export function NeedsReLoginStatus({ devtoolsUrl }: Props) {
  const [iframeOpen, setIframeOpen] = useState(false);
  const [thirdPartyGuide, setThirdPartyGuide] = useState(false);

  const [openClickState, openClick] = useAsyncFn(async () => {
    const resp = await fetch('/api/devToolsUrl', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: changeHostnameToLocationHostname(devtoolsUrl),
      }),
    });
    if (!resp.ok) return;
    const resolvedUrl = await resp.text();
    if (resolvedUrl) setIframeOpen(true);
    return resolvedUrl;
  }, []);

  return (
    <>
      <Column sx={{ alignItems: 'center' }}>
        <Body1>
          Slack Presence couldn't load your Slack workspace. Most likely, your Slack Login
          session has expired and you have to re-login manually.
          <br />
          Click the button below to open Slack presence internal browser and then login to
          your Slack workspace. When you are done enable Slack presence again.
        </Body1>
        <LoadingButton
          loading={openClickState.loading}
          disabled={!devtoolsUrl}
          sx={{ my: 2 }}
          fullWidth={false}
          variant='contained'
          onClick={openClick}
        >
          Open browser
        </LoadingButton>
        <Body2>
          If you see a blank page you may have to enable third-party cookies. Click{' '}
          <Link href='#' onClick={() => setThirdPartyGuide(true)}>
            here
          </Link>{' '}
          here to see how to do this.
        </Body2>
      </Column>
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
            src={openClickState.value || ''}
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
