import { ExtensionContext, workspace } from 'vscode';
import { ILogger } from '../logger/Logger';
import { FileWatcherService } from '../services/FileWatcherService';
import { LanguageFeatureService } from '../services/LanguageClientService';
import { CommandService } from '../services/CommandService';
import { InputBoxService } from '../services/InputBoxService';
import { createFileCommands } from '../commands/fileCommands';
import { createInputBoxCommands } from '../commands/inputBoxCommands';
import { IService } from '../services/types';
import { ChatService } from '../services/ChatService';
import { createChatCommands } from '../commands/chatCommands';

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
      // Initialize command service first as other services depend on it
      const commandService = new CommandService({
        logger: this.logger,
        context: this.context,
      });
      await commandService.initialize();

      // Initialize other services
      const fileWatcherService = new FileWatcherService({
        logger: this.logger,
        workspacePath,
      });

      const languageClientService = new LanguageFeatureService({
        logger: this.logger,
        context: this.context,
        workspacePath,
      });

      const inputBoxService = new InputBoxService({
        logger: this.logger,
        commandService,
      });

      const chatService = new ChatService({
        logger: this.logger,
        context: this.context
      });

      // Initialize remaining services
      await fileWatcherService.initialize();
      await languageClientService.initialize();
      await inputBoxService.initialize();
      await chatService.initialize();

      // Register all commands after services are initialized
      const fileCommands = createFileCommands(fileWatcherService);
      const inputBoxCommands = createInputBoxCommands(inputBoxService);
      const chatCommands = createChatCommands(chatService);

      [...fileCommands, ...inputBoxCommands, ...chatCommands].forEach((command) => {
        commandService.registerCommand(command);
      });

      // Store services for disposal
      this.services.push(
        commandService,
        fileWatcherService,
        languageClientService,
        inputBoxService,
        chatService
      );
    } catch (error) {
      this.logger.error(
        `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
      );
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
