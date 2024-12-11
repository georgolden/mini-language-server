import { window } from 'vscode';
import { ILogger } from '../logger/Logger';
import { ICommandService } from '../commands/types';

export class InputBoxHandler {
  constructor(
    private readonly logger: ILogger,
    private readonly commandService: ICommandService,
  ) {}

  async handleInput(input: string): Promise<void> {
    try {
      this.logger.debug(`InputBoxHandler: Processing input: ${input}`);

      // Example: if input starts with "files", execute file listing command
      if (input.startsWith('files')) {
        await this.commandService.executeCommand('miniLanguageServer.listFiles');
        return;
      }

      // Default behavior: show received command
      await window.showInformationMessage(`Command received: ${input}`);
    } catch (error) {
      this.logger.error(`InputBoxHandler: Error processing command: ${error}`);
      throw error;
    }
  }
}
