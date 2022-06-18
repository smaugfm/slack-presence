import React, { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  useTheme,
} from '@mui/material';
import { VisibilityOff } from '@mui/icons-material';
import { css } from '@emotion/react';
import { ThirdPartyGuideImage } from './ThirdPartyGuideImage';

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ['Click on the icon ', 'Click on the link', 'Allow cookies'];

export function ThirdPartyCookiesGuide(props: Props) {
  const t = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const incrementStep = useCallback(() => setActiveStep(s => s + 1), []);
  const decrementStep = useCallback(() => setActiveStep(s => s - 1), []);
  const onClose = useCallback(() => {
    props.onClose();
    setTimeout(() => setActiveStep(0), 500);
  }, [props]);

  return (
    <Dialog
      open={props.open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      keepMounted={false}
    >
      <DialogTitle>How to enable third-party cookies?</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map((label, index) => {
            return (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>
        {activeStep === 0 ? (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Click on this icon &nbsp;
              <VisibilityOff
                fontSize='small'
                css={css`
                  margin-bottom: -${t.spacing(0.5)};
                `}
              />
            </DialogContentText>
            <ThirdPartyGuideImage
              src='tg1.png'
              alt={'Click on the "Third-party cookie blocking" icon'}
            />
          </>
        ) : activeStep === 1 ? (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Click on the link at the bottom
            </DialogContentText>
            <ThirdPartyGuideImage src='tg2.png' alt={'Click on the link'} />
          </>
        ) : activeStep === 2 ? (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Click on the button to allow third-party cookies
            </DialogContentText>
            <ThirdPartyGuideImage src='tg3.png' alt={'Click on "Allow cookies" button'} />
          </>
        ) : (
          <></>
        )}
      </DialogContent>
      <DialogActions>
        {activeStep === 0 ? (
          <Button onClick={incrementStep} key={'next' + activeStep}>
            Next
          </Button>
        ) : activeStep !== 2 ? (
          <>
            <Button onClick={decrementStep} key={'prev' + activeStep}>
              Previous
            </Button>
            <Button onClick={incrementStep} key={'next' + activeStep}>
              Next
            </Button>
          </>
        ) : (
          <Button onClick={onClose} key='finish'>
            Finish
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
