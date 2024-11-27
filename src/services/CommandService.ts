import * as vscode from 'vscode';
import { IService, ServiceDependencies, ServiceState } from './types';
import { Command, ICommandService } from '../commands/types';
import { ILogger } from '../logger/Logger';

interface CommandServiceDeps extends ServiceDependencies {
  context: vscode.ExtensionContext;
}

export class CommandService implements ICommandService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  private readonly commands: Map<string, Command>;
  private readonly disposables: vscode.Disposable[];
  private readonly logger: ILogger;
  private readonly context: vscode.ExtensionContext;

  constructor(deps: CommandServiceDeps) {
    this.logger = deps.logger;
    this.context = deps.context;
    this.commands = new Map();
    this.disposables = [];
  }

  private assertState(action: string): void {
    if (this.state.isDisposed) {
      throw new Error(`Cannot ${action}: service is disposed`);
    }
    if (action === 'initialize' && this.state.isInitialized) {
      throw new Error('Service is already initialized');
    }
    if (action !== 'initialize' && !this.state.isInitialized) {
      throw new Error(`Cannot ${action}: service is not initialized`);
    }
  }

  async initialize(): Promise<void> {
    this.assertState('initialize');
    this.logger.debug('CommandService: Initializing...');
    this.state.isInitialized = true;
    this.logger.debug('CommandService: Initialized');
  }

  registerCommand(command: Command): void {
    this.assertState('registerCommand');

    if (this.commands.has(command.id)) {
      throw new Error(`Command ${command.id} is already registered`);
    }

    this.logger.debug(`CommandService: Registering command ${command.id}`);

    this.commands.set(command.id, command);

    const disposable = vscode.commands.registerCommand(command.id, async (...args) => {
      try {
        this.logger.debug(`CommandService: Executing command ${command.id}`);
        await command.handler(...args);
      } catch (error) {
        this.logger.error(`CommandService: Error executing command ${command.id}: ${error}`);
        throw error;
      }
    });

    this.disposables.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  async executeCommand(id: string, ...args: any[]): Promise<void> {
    this.assertState('executeCommand');

    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command ${id} not found`);
    }

    await command.handler(...args);
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');
    this.logger.debug('CommandService: Disposing...');

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
    this.commands.clear();

    this.state.isDisposed = true;
    this.logger.debug('CommandService: Disposed');
  }
}
