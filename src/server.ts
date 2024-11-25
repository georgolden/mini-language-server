import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  DidChangeWatchedFilesNotification,
  WatchKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { WorkspaceManager } from './server/workspace/WorkspaceManager';

class AnalysisServer {
  private connection = createConnection(ProposedFeatures.all);
  private documents = new TextDocuments(TextDocument);
  private workspaceManager: WorkspaceManager | undefined;

  constructor() {
    this.connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
      this.connection.console.info('Server initializing...');

      if (params.workspaceFolders) {
        this.workspaceManager = new WorkspaceManager({
          connection: this.connection,
          workspaceFolders: params.workspaceFolders
        });

        await this.workspaceManager.initialize();
      }

      return {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental
          },
          workspace: {
            workspaceFolders: {
              supported: true,
              changeNotifications: true
            }
          }
        }
      };
    });

    // Set up file watchers after initialization
    this.connection.onInitialized(() => {
      this.connection.client.register(DidChangeWatchedFilesNotification.type, {
        watchers: [
          {
            globPattern: "**/*.{ts,tsx,js,jsx}",
            kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete
          }
        ]
      });
      this.connection.console.info('Registered file watchers');
    });

    this.connection.onDidChangeWatchedFiles(params => {
      this.connection.console.info('File change event received in server');
      if (this.workspaceManager) {
        this.workspaceManager.handleWatchedFilesChange(params);
      }
    });

    this.documents.listen(this.connection);
    this.connection.listen();
  }
}

new AnalysisServer();
