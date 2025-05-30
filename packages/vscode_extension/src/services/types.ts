import { ILogger } from '../logger/Logger.js';

export interface ServiceDependencies {
  logger: ILogger;
}

export interface ServiceState {
  isInitialized: boolean;
  isDisposed: boolean;
}

export interface IService {
  readonly state: ServiceState;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
