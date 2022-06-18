import React from 'react';
import { Subtitle2 } from './typography';
import { Card } from '@mui/material';
import { PropsWithChildren } from 'react';
import { WithCss } from './types';

type Props = {
  title: string;
};

export function MainCard(props: WithCss<PropsWithChildren<Props>>) {
  return (
    <>
      <Subtitle2 sx={{ mb: { xs: 1, md: 2 } }}>{props.title}</Subtitle2>
      <Card
        variant='outlined'
        sx={{ '&:not(:last-child)': { mb: { xs: 2, md: 4 } }, p: { xs: 2, md: 4 } }}
      >
        {props.children}
      </Card>
    </>
  );
}
