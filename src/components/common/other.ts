import { isIPv4 } from 'is-ip';

export async function dnsLookup(host: string): Promise<string | undefined> {
  try {
    const obj = await (await fetch(`https://dns.google/resolve?name=${host}&type=A`)).json();
    return obj.Answer[0].data;
  } catch (e) {
    console.error(e)
  }
}

export function isDesktopChrome(): boolean {
  const win = window as any;
  const winNav = window.navigator;
  const vendorName = winNav.vendor;

  const isChromium = win.chrome;
  const isOpera = typeof win.opr !== "undefined";
  const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
  return isChromium !== null
    && typeof isChromium !== "undefined"
    && vendorName === "Google Inc." && !isOpera && !isIEedge
    && (typeof win.userAgentData === "undefined" || win.userAgentData.brands.some((x: any) => x.brand === "Google Chrome"));
}

// https://github.com/puppeteer/puppeteer/issues/2242
export function isHostnameValidForDevtools(host: string) {
  return (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.localhost') ||
    isIPv4(host)
  );
}
