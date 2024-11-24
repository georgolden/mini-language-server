import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
  } from 'vscode-languageserver/node';
  import { TextDocument } from 'vscode-languageserver-textdocument';
  
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  
  // Log startup
  connection.console.info('Starting Mini LSP Server...');
  
  connection.onInitialize((params: InitializeParams) => {
    connection.console.info('Server initializing...');
    
    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
      },
    };
  
    connection.console.info('Server initialized with capabilities');
    return result;
  });
  
  connection.onInitialized(() => {
    connection.console.info('Server initialization complete');
  });
  
  // Log when documents change
  documents.onDidChangeContent(change => {
    connection.console.info(`Document changed: ${change.document.uri}`);
  });
  
  // Document open
  documents.onDidOpen(event => {
    connection.console.info(`Document opened: ${event.document.uri}`);
  });
  
  // Document close
  documents.onDidClose(event => {
    connection.console.info(`Document closed: ${event.document.uri}`);
  });
  
  documents.listen(connection);
  
  // Log before starting connection
  connection.console.info('Server starting connection listener...');
  connection.listen();
  