import { ExtensionContext, languages, commands, window, workspace, TextDocument, Position, CancellationToken, CompletionContext, CompletionList, Hover, Definition, Location, DocumentSymbol, SymbolInformation, FormattingOptions, TextEdit } from 'vscode';
import { IService, ServiceDependencies, ServiceState } from './types';
import { ILogger } from '../logger/Logger';

interface LanguageFeatureDeps extends ServiceDependencies {
  context: ExtensionContext;
  workspacePath: string;
}

export class LanguageFeatureService implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  private readonly logger: ILogger;
  private readonly context: ExtensionContext;
  private readonly workspacePath: string;

  constructor(deps: LanguageFeatureDeps) {
    this.logger = deps.logger;
    this.context = deps.context;
    this.workspacePath = deps.workspacePath;
  }

  private assertState(action: string): void {
    if (this.state.isDisposed) {
      throw new Error(`Cannot ${action}: service is disposed`);
    }
    if (action === 'initialize' && this.state.isInitialized) {
      throw new Error('Service is already initialized');
    }
    if (action !== 'initialize' && !this.state.isInitialized) {
      throw new Error(`Cannot ${action}: service is not initialized`);
    }
  }

  async initialize(): Promise<void> {
    this.assertState('initialize');
    this.logger.info('Language Feature Service initializing...');
    
    // No need to start a language server - we'll use VS Code's API
    
    this.state.isInitialized = true;
    this.logger.info('Language Feature Service initialized successfully');
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');
    
    // Nothing to dispose since we're not creating our own client
    
    this.state.isDisposed = true;
  }

  // Language feature methods using VS Code API

  /**
   * Get completions at a specific position in a document
   */
  async getCompletions(document: TextDocument, position: Position): Promise<CompletionList | undefined> {
    this.assertState('getCompletions');
    
    try {
      // Use the executeCommand API to get completions
      return await commands.executeCommand<CompletionList>(
        'vscode.executeCompletionItemProvider',
        document.uri,
        position
      );
    } catch (error) {
      this.logger.error(`Error getting completions: ${error}`);
      return undefined;
    }
  }

  /**
   * Get hover information at a specific position
   */
  async getHover(document: TextDocument, position: Position): Promise<Hover[] | undefined> {
    this.assertState('getHover');
    
    try {
      return await commands.executeCommand<Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );
    } catch (error) {
      this.logger.error(`Error getting hover: ${error}`);
      return undefined;
    }
  }

  /**
   * Get definition locations for a symbol at a specific position
   */
  async getDefinition(document: TextDocument, position: Position): Promise<Location[] | undefined> {
    this.assertState('getDefinition');
    
    try {
      return await commands.executeCommand<Location[]>(
        'vscode.executeDefinitionProvider',
        document.uri,
        position
      );
    } catch (error) {
      this.logger.error(`Error getting definition: ${error}`);
      return undefined;
    }
  }

  /**
   * Get type definition locations for a symbol at a specific position
   */
  async getTypeDefinition(document: TextDocument, position: Position): Promise<Location[] | undefined> {
    this.assertState('getTypeDefinition');
    
    try {
      return await commands.executeCommand<Location[]>(
        'vscode.executeTypeDefinitionProvider',
        document.uri,
        position
      );
    } catch (error) {
      this.logger.error(`Error getting type definition: ${error}`);
      return undefined;
    }
  }

  /**
   * Get references to a symbol at a specific position
   */
  async getReferences(document: TextDocument, position: Position, includeDeclaration: boolean = true): Promise<Location[] | undefined> {
    this.assertState('getReferences');
    
    try {
      return await commands.executeCommand<Location[]>(
        'vscode.executeReferenceProvider',
        document.uri,
        position
      );
    } catch (error) {
      this.logger.error(`Error getting references: ${error}`);
      return undefined;
    }
  }

  /**
   * Get document symbols (outline)
   */
  async getDocumentSymbols(document: TextDocument): Promise<DocumentSymbol[] | undefined> {
    this.assertState('getDocumentSymbols');
    
    try {
      return await commands.executeCommand<DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );
    } catch (error) {
      this.logger.error(`Error getting document symbols: ${error}`);
      return undefined;
    }
  }

  /**
   * Format a document
   */
  async formatDocument(document: TextDocument): Promise<TextEdit[] | undefined> {
    this.assertState('formatDocument');
    
    try {
      return await commands.executeCommand<TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        document.uri
      );
    } catch (error) {
      this.logger.error(`Error formatting document: ${error}`);
      return undefined;
    }
  }

  /**
   * Execute a language-specific command
   */
  async executeCommand(command: string, ...args: any[]): Promise<any> {
    this.assertState('executeCommand');
    
    try {
      return await commands.executeCommand(command, ...args);
    } catch (error) {
      this.logger.error(`Error executing command ${command}: ${error}`);
      throw error;
    }
  }
}
