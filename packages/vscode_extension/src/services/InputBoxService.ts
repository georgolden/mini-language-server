import { window, InputBox, Disposable } from 'vscode';
import { ServiceDependencies, ServiceState, IService } from './types';
import { ILogger } from '../logger/Logger';
import { InputBoxHandler } from '../input/InputBoxHandler';
import { ICommandService } from '../commands/types';

interface InputBoxDeps extends ServiceDependencies {
  commandService: ICommandService;
}

export class InputBoxService implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  private inputBox: InputBox | undefined;
  private readonly logger: ILogger;
  private readonly disposables: Disposable[] = [];
  private readonly handler: InputBoxHandler;

  constructor(deps: InputBoxDeps) {
    this.logger = deps.logger;
    this.handler = new InputBoxHandler(deps.logger, deps.commandService);
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

  private createInputBox(): void {
    if (this.inputBox) {
      this.inputBox.dispose();
    }

    this.inputBox = window.createInputBox();
    this.inputBox.placeholder = 'Type a command...';

    this.disposables.push(
      this.inputBox.onDidAccept(async () => {
        const value = this.inputBox?.value;
        if (value) {
          try {
            await this.handler.handleInput(value);
            this.inputBox!.value = ''; // Clear after processing
          } catch (error) {
            this.logger.error(`InputBoxService: Error processing input: ${error}`);
          }
        }
      }),
      this.inputBox.onDidHide(() => {
        this.logger.debug('InputBoxService: Input box hidden');
      }),
    );
  }

  async initialize(): Promise<void> {
    this.assertState('initialize');
    this.logger.debug('InputBoxService: Initializing...');

    this.createInputBox();
    if (this.inputBox) {
      this.inputBox.show();
    }

    this.state.isInitialized = true;
    this.logger.debug('InputBoxService: Initialized');
  }

  showInputBox(): void {
    this.assertState('showInputBox');

    if (!this.inputBox) {
      this.createInputBox();
    }

    this.inputBox?.show();
    this.logger.debug('InputBoxService: Input box shown');
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');
    this.logger.debug('InputBoxService: Disposing...');

    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;

    if (this.inputBox) {
      this.inputBox.dispose();
      this.inputBox = undefined;
    }

    this.state.isDisposed = true;
    this.logger.debug('InputBoxService: Disposed');
  }
}
