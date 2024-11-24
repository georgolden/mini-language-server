import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  Connection,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection: Connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Log startup
connection.console.info('Server process starting...');

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info('Server initializing...');
  
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Full,
      },
    },
  };
});

// Log when documents are opened
documents.onDidOpen((event) => {
  connection.console.log(`Document opened: ${event.document.uri}`);
});

// Log when documents change
documents.onDidChangeContent((change) => {
  connection.console.log(`Document changed: ${change.document.uri}`);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
