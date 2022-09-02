import { api } from '../../electron/preload';

declare global {
  interface Window {
    Main: typeof api;
    WS_PORT: number;
  }
}
