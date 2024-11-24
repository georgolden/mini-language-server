import * as path from 'path';
import { ExtensionContext, window, workspace } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;
// Create output channel at the module level
const outputChannel = window.createOutputChannel('Mini LSP');

export function activate(context: ExtensionContext) {
  // Log activation
  outputChannel.show(true); // Make the channel visible
  outputChannel.appendLine('Activating Mini LSP Extension...');

  // Get configuration
  const config = workspace.getConfiguration('miniLanguageServer');
  
  // Path to server module
  const serverModule = context.asAbsolutePath(
    path.join('dist', 'server', 'src', 'server.js')
  );
  outputChannel.appendLine(`Server module path: ${serverModule}`);

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.txt')
    },
    outputChannel: outputChannel, // Use the same output channel
    traceOutputChannel: outputChannel // Also trace LSP communication
  };

  client = new LanguageClient(
    'mini-language-server',
    'Mini Language Server',
    serverOptions,
    clientOptions
  );

  // Handle client startup
  try {
    outputChannel.appendLine('Starting client...');
    client.start();
    outputChannel.appendLine('Client started successfully');
  } catch (err) {
    outputChannel.appendLine(`Error starting client: ${err}`);
    throw err;
  }

  // Register configuration change handler
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('miniLanguageServer')) {
        outputChannel.appendLine('Configuration changed');
        const newConfig = workspace.getConfiguration('miniLanguageServer');
        client.sendNotification('custom/configurationChange', { config: newConfig });
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  outputChannel.appendLine('Deactivating extension...');
  if (!client) {
    return undefined;
  }
  return client.stop();
}
