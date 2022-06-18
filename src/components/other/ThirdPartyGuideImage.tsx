import { Box } from '@mui/material';
import { Row } from '../common/layout';

type Props = {
  src: string;
  alt: string;
};

export function ThirdPartyGuideImage(props: Props) {
  return (
    <Row sx={{ justifyContent: 'center' }}>
      <Box sx={{ height: 300 }} component='img' alt={props.alt} src={props.src} />
    </Row>
  );
}
