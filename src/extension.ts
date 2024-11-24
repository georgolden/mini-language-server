import * as path from 'path';
import { ExtensionContext, window, workspace } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  // Create output channel first thing
  const outputChannel = window.createOutputChannel('Mini Language Server');
  context.subscriptions.push(outputChannel);
  
  // Immediate logging to verify channel creation
  outputChannel.show(true); // Force show the channel
  outputChannel.appendLine('Extension activation started');
  
  try {
    const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));
    outputChannel.appendLine(`Server module path: ${serverModule}`);
    
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          cwd: process.cwd(),
        }
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { 
          execArgv: ['--nolazy', '--inspect=6009'],
          cwd: process.cwd(),
        }
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: 'plaintext' }],
      outputChannel,
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
      },
    };

    // Create the language client
    client = new LanguageClient(
      'miniLanguageServer',
      'Mini Language Server',
      serverOptions,
      clientOptions
    );

    outputChannel.appendLine('Starting client...');
    
    // Start the client
    await client.start();
    outputChannel.appendLine('Client started successfully');
    
  } catch (error) {
    outputChannel.appendLine(`ERROR: ${error}`);
    console.error(error);
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  const outputChannel = window.createOutputChannel('Mini Language Server');
  outputChannel.appendLine('Extension deactivating...');
  
  if (!client) {
    return undefined;
  }
  
  return client.stop();
}
