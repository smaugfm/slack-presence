import { Column } from '../common/layout';
import { Body1 } from '../common/typography';

export function HostnameIsNotIp() {
  return (
    <Column sx={{ alignItems: 'center' }}>
      <Body1>
        Unfortunately you can access the server where you host Slack-presence only by IP-address
        and not by hostname.<br />
        Please manually resolve <b>{window.location.hostname}</b> to an IP address and
        replace it in your address bar.
      </Body1>
    </Column>
  );
}
