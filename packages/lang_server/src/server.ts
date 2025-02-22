import {
  createConnection,
  type InitializeParams,
  type InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  DidChangeWatchedFilesNotification,
  WatchKind,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { WorkspaceFSManager } from './server/workspace/WorkspaceFSManager.js';
import { createMCPServer } from './mcp/server.js';

export class AnalysisServer {
  private connection = createConnection(ProposedFeatures.all);
  private documents = new TextDocuments(TextDocument);
  private workspaceManager: WorkspaceFSManager | undefined;
  private mcpServer: any;

  constructor() {
    this.connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
      this.connection.console.info('Server initializing...');

      if (params.workspaceFolders) {
        this.workspaceManager = new WorkspaceFSManager({
          connection: this.connection,
          workspaceFolders: params.workspaceFolders,
        });

        await this.workspaceManager.initialize();

        // Initialize MCP server with workspace manager
        this.mcpServer = createMCPServer(
          { wsPort: 3001, keepAliveInterval: 30000 },
          {
            fsManager: this.workspaceManager,
            logger: this.connection.console,
          },
        );
      }

      return {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
          },
          workspace: {
            workspaceFolders: {
              supported: true,
              changeNotifications: true,
            },
          },
        },
      };
    });

    // Set up file watchers after initialization
    this.connection.onInitialized(() => {
      this.connection.client.register(DidChangeWatchedFilesNotification.type, {
        watchers: [
          {
            globPattern: '**/*.{ts,tsx,js,jsx}',
            kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
          },
        ],
      });
      this.connection.console.info('Registered file watchers');
    });

    this.connection.onDidChangeWatchedFiles((params) => {
      this.connection.console.info('File change event received in server');
      if (this.workspaceManager) {
        this.workspaceManager.handleWatchedFilesChange(params);
      }
    });

    this.documents.listen(this.connection);
    this.connection.listen();
  }
}
