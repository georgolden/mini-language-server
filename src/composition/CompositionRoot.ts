import { ExtensionContext, workspace } from 'vscode';
import { ILogger } from '../logger/Logger';
import { FileWatcherService } from '../services/FileWatcherService';
import { LanguageClientService } from '../services/LanguageClientService';
import { IService } from '../services/types';

interface CompositionRootDeps {
  logger: ILogger;
  context: ExtensionContext;
}

export class CompositionRoot {
  private readonly services: IService[] = [];
  private readonly logger: ILogger;
  private readonly context: ExtensionContext;

  constructor(deps: CompositionRootDeps) {
    this.logger = deps.logger;
    this.context = deps.context;
  }

  async initialize(): Promise<void> {
    const workspacePath = workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      this.logger.error('No workspace folder found');
      return;
    }

    try {
      const fileWatcherService = new FileWatcherService({ 
        logger: this.logger,
        workspacePath 
      });
      
      const languageClientService = new LanguageClientService({
        logger: this.logger,
        context: this.context,
        workspacePath
      });

      await fileWatcherService.initialize();
      await languageClientService.initialize();

      this.services.push(fileWatcherService, languageClientService);
      
    } catch (error) {
      this.logger.error(`Initialization error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    for (const service of this.services) {
      await service.dispose();
    }
    this.services.length = 0;
    this.logger.dispose();
  }
}
