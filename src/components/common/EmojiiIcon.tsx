import { SvgIconProps, useTheme } from '@mui/material';
import { WithCss } from './types';
import { css } from '@emotion/react';
import { forwardRef } from 'react';

type Props = Pick<SvgIconProps, 'color' | 'fontSize' | 'htmlColor'> & {
  symbol: string;
  label?: string;
};

export const EmojiiIcon = forwardRef<HTMLSpanElement, WithCss<Props>>(
  ({ css: outerCss, color, htmlColor, fontSize, label, symbol, ...rest }, ref) => {
    const theme = useTheme();
    fontSize = fontSize || 'medium';
    color = color || 'inherit';
    const computedFontSize = {
      inherit: 'inherit',
      small: theme.typography.pxToRem(20),
      medium: theme.typography.pxToRem(24),
      large: theme.typography.pxToRem(35),
    }[fontSize];
    const computedColor: string | undefined =
      htmlColor ||
      ((theme.palette[color as keyof typeof theme.palette] as any)?.main ??
        {
          action: theme.palette.action.active,
          disabled: theme.palette.action.disabled,
          inherit: undefined,
        }[color as string]);

    return (
      <span
        ref={ref}
        css={css`
          font-size: ${computedFontSize};
          color: ${computedColor};
          ${outerCss};
        `}
        role='img'
        aria-label={label || ''}
        aria-hidden={label ? 'false' : 'true'}
        {...rest}
      >
        {symbol}
      </span>
    );
  },
);
