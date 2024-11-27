import { FileWatcherService } from '../services/FileWatcherService';
import { Command } from './types';
import { window } from 'vscode';

export function createFileCommands(fileWatcher: FileWatcherService): Command[] {
  return [
    {
      id: 'miniLanguageServer.showFileCount',
      title: 'Show File Count',
      handler: async () => {
        const count = fileWatcher.files.size;
        await window.showInformationMessage(`Current file count: ${count}`);
      },
    },
    {
      id: 'miniLanguageServer.listFiles',
      title: 'List All Files',
      handler: async () => {
        const files = Array.from(fileWatcher.files.values());
        const items = files.map((file) => ({
          label: file.fullName,
          description: file.path,
        }));

        const selected = await window.showQuickPick(items, {
          placeHolder: 'Select a file to view details',
        });

        if (selected) {
          const file = fileWatcher.files.get(selected.description);
          if (file) {
            // Example action: show file info
            await window.showInformationMessage(
              `File: ${file.fullName}\nSize: ${file.content.length} bytes`,
            );
          }
        }
      },
    },
  ];
}
