export type UserActiveData = {
  avatarUrls: string[];
  userName: string;
}

export type PresenceServiceTimeouts = {
  waitLoad: number;
  waitActive: number;
}

export interface PresenceService<T = UserActiveData> {
  name: string
  init(): Promise<void>
  load(url: string): Promise<boolean>
  waitLoaded(timeout?: number): Promise<boolean>
  waitActive(timeout?: number): Promise<boolean>
  getScreenshot(): Promise<Buffer>
  getActiveData(): Promise<T>
  close(): void
}
