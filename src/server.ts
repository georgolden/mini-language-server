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

const connection: Connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.console.info('Server process starting...');

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info('Server initializing...');
  
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
      },
    },
  };
});

documents.onDidOpen((event) => {
  connection.console.log(`Document opened: ${event.document.uri}`);
});

documents.onDidChangeContent((change) => {
  connection.console.log(`Document changed: ${change.document.uri}`);
});

documents.listen(connection);
connection.listen();
