import TypedEmitter from 'typed-emitter';
import { Options, PresenceStatus } from '../src/common/common';
import EventEmitter from 'events';

export type UserActiveData = {
  avatarUrls: string[];
  userName: string;
};

export type PresenceServiceTimeouts = {
  waitLoad: number;
  waitActive: number;
};

export interface PresenceService<T = UserActiveData> {
  name: string;

  init(): Promise<void>;

  load(url: string): Promise<boolean>;

  waitLoaded(timeout?: number): Promise<boolean>;

  waitActive(timeout?: number): Promise<boolean>;

  getScreenshot(): Promise<Buffer>;

  getActiveData(): Promise<T>;

  close(): void;
}

export interface Notifier {
  notify(title: string, message: string, imagePromise?: Promise<Buffer>): Promise<void>;
}

export interface NotifierFactory {
  createNotifier(): Notifier | undefined;
}

export type PresenceLoopEvents = {
  status: (status: PresenceStatus) => void;
  options: (options: Options) => void;
};

export abstract class PresenceLoop extends (EventEmitter as new () => TypedEmitter<PresenceLoopEvents>) {
  public abstract getOptions(): Options;

  public abstract getStatus(): PresenceStatus;

  public abstract start(): Promise<void>;

  public abstract close(): void;

  public abstract saveOptionsAndChangeState(newOptions: Partial<Options>): Promise<void>;
}

export interface LoopControlInterfaceFactory {
  create(loop: PresenceLoop): LoopControlInterface | undefined
}

export interface LoopControlInterface {
  start(): Promise<void>
}
