import React, { useMemo } from 'react';
import { Row } from '../common/layout';
import { css } from '@emotion/react';
import { Box, useTheme } from '@mui/material';
import { Body2 } from '../common/typography';
import { useRelativeDateTime } from '../hooks/useRelativeDateTime';

type Props = {
  name?: string;
  avatarUrl?: string;
  avatarUrl2x?: string;
  endTime?: Date;
};

export function ActiveStatus({ avatarUrl, avatarUrl2x, endTime, name }: Props) {
  const t = useTheme();
  const relativeTime = useRelativeDateTime(endTime, false);

  const text = useMemo(() => {
    return `online until ${relativeTime}`;
  }, [relativeTime]);

  return (
    <Row
      sx={{
        justifyContent: 'space-between',
        alignItems: 'center',
        display: 'flex',
      }}
    >
      <Row sx={{ alignItems: 'center' }}>
        <div
          css={css`
            display: inline-flex;
            position: relative;
          `}
        >
          <Box
            sx={{
              height: t.spacing(5),
              width: t.spacing(5),
              borderRadius: t.spacing(0.5),
              overflow: 'hidden',
            }}
          >
            <img
              src={avatarUrl}
              srcSet={avatarUrl2x}
              alt='Avatar'
              css={css`
                width: ${t.spacing(5)};
                background-repeat: no-repeat;
                background-size: 100%;
              `}
            />
          </Box>
        </div>
        <Box sx={{ mt: 0.5, flex: '1 1 auto', ml: 1.5, minWidth: 0 }}>
          <div
            css={css`
              font-weight: 900;
            `}
          >
            {name}
          </div>
          <Row
            css={css`
              color: rgba(29, 28, 29, 0.7);
              font-size: 13px;
              line-height: 1.38463;
              margin: -4px 0 -4px -6px;
              padding: 4px 0;
            `}
          >
            <Row
              sx={{
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                css={css`
                  width: 50%;
                  height: 50%;
                  margin-bottom: 3px;
                  background-color: #007a5a;
                  border-radius: 50%;
                `}
              ></div>
            </Row>
            Active
          </Row>
        </Box>
      </Row>
      <Body2 color='textSecondary'>{text}</Body2>
    </Row>
  );
}
