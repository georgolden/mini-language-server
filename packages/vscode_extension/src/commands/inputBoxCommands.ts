import { Command } from './types';
import { InputBoxService } from '../services/InputBoxService';

export function createInputBoxCommands(inputBoxService: InputBoxService): Command[] {
  return [
    {
      id: 'miniLanguageServer.showInputBox',
      title: 'Show Input Box',
      handler: async () => {
        inputBoxService.showInputBox();
      },
    },
  ];
}
