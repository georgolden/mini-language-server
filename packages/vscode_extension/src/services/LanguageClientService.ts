import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { IService, ServiceDependencies, ServiceState } from './types';
import { ILogger } from '../logger/Logger';
import * as path from 'path';

interface LanguageClientDeps extends ServiceDependencies {
  context: ExtensionContext;
  workspacePath: string;
}

const LANG_SERVER_PATH = path.join('dist', 'src', 'server.js');

export class LanguageClientService implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  private client: LanguageClient | undefined;
  private readonly logger: ILogger;
  private readonly context: ExtensionContext;
  private readonly workspacePath: string;

  constructor(deps: LanguageClientDeps) {
    this.logger = deps.logger;
    this.context = deps.context;
    this.workspacePath = deps.workspacePath;
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

    const serverModule = this.context.asAbsolutePath(LANG_SERVER_PATH);
    this.logger.info(`Server module path: ${serverModule}`);

    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { cwd: this.workspacePath },
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: ['--nolazy', '--inspect=6009'],
          cwd: this.workspacePath,
        },
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascriptreact' },
      ],
    };

    this.client = new LanguageClient(
      'miniLanguageServer',
      'Mini Language Server',
      serverOptions,
      clientOptions,
    );

    await this.client.start();
    this.state.isInitialized = true;
    this.logger.info('Language client started successfully');
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');

    if (this.client) {
      await this.client.stop();
      this.client = undefined;
    }

    this.state.isDisposed = true;
  }
}
