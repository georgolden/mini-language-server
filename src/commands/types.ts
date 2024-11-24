import { IService } from '../services/types';

export interface Command {
  id: string;
  title: string;
  handler: (...args: any[]) => Promise<void>;
}

export interface ICommandService extends IService {
  registerCommand(command: Command): void;
  executeCommand(id: string, ...args: any[]): Promise<void>;
}
