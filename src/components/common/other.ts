import { isIPv4 } from 'is-ip';

// https://github.com/puppeteer/puppeteer/issues/2242
export function hostIsLocalOrIp(host: string) {
  return (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.localhost') ||
    isIPv4(host)
  );
}
