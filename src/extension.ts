import * as path from 'path';
import { ExtensionContext, window, workspace } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { FileWatcher } from './watchers/FileWatcher';

let client: LanguageClient | undefined;
let fileWatcher: FileWatcher | undefined;

export async function activate(context: ExtensionContext) {
  const outputChannel = window.createOutputChannel('Mini Language Server');
  context.subscriptions.push(outputChannel);

  const debug = (message: string) => {
    outputChannel.appendLine(message);
  };

  if (!workspace.workspaceFolders?.[0]) {
    debug('No workspace folder found');
    return;
  }

  const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
  debug(`Workspace path: ${workspacePath}`);
  
  try {
    // Initialize file watcher with debug logging
    fileWatcher = new FileWatcher(workspacePath, debug);
    
    debug('Starting file watcher initialization...');
    const files = await fileWatcher.initialize();
    debug(`Initialized with ${files.size} files`);

    // File watcher events
    fileWatcher
      .on('add', ({ file }) => {
        debug(`[FileWatcher Event] File added: ${file.fullName}`);
      })
      .on('change', ({ file }) => {
        debug(`[FileWatcher Event] File changed: ${file.fullName}`);
      })
      .on('unlink', ({ file }) => {
        debug(`[FileWatcher Event] File removed: ${file.fullName}`);
      });

    // Set up language server
    const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));
    debug(`Server module path: ${serverModule}`);
    
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { cwd: workspacePath }
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { 
          execArgv: ['--nolazy', '--inspect=6009'],
          cwd: workspacePath,
        }
      }
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascriptreact' }
      ],
      outputChannel,
    };

    client = new LanguageClient(
      'miniLanguageServer',
      'Mini Language Server',
      serverOptions,
      clientOptions
    );

    await client.start();
    debug('Language client started successfully');

    // Add to subscriptions for cleanup
    context.subscriptions.push({
      dispose: () => fileWatcher?.dispose(),
    });

  } catch (error) {
    debug(`ERROR: ${error}`);
    console.error(error);
    throw error;
  }
}

export async function deactivate(): Promise<void> {
  if (fileWatcher) {
    await fileWatcher.dispose();
  }
  if (client) {
    await client.stop();
  }
}
