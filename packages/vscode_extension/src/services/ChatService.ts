import * as vscode from 'vscode';
import { window, WebviewPanel, ExtensionContext } from 'vscode';
import { IService, ServiceDependencies, ServiceState } from './types';
import { ChatView } from './chat/components/ChatView';
import { ILogger } from '../logger/Logger';

interface ChatServiceDeps extends ServiceDependencies {
  context: ExtensionContext;
}

export class ChatService implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };
  private chatPanel?: WebviewPanel;
  private readonly logger: ILogger;
  
  constructor(private readonly deps: ChatServiceDeps) {
    this.logger = deps.logger;
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
    this.logger.debug('ChatService: Initializing...');
    this.state.isInitialized = true;
    this.logger.debug('ChatService: Initialized');
  }

  openChat(): void {
    if (!this.chatPanel) {
      this.chatPanel = window.createWebviewPanel(
        'miniLanguageServerChat',
        'Chat',
        window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
        { enableScripts: true }
      );

      this.chatPanel.webview.html = ChatView.render();
      this.setupMessageHandling();
    }
    this.chatPanel.reveal();
  }

  private setupMessageHandling(): void {
    this.chatPanel?.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'message':
            this.handleChatMessage(message.text);
            break;
        }
      },
      undefined,
      this.deps.context.subscriptions
    );
  }

  async handleChatMessage(text: string): Promise<void> {
    const response = "Your message is processing";
    
    await this.chatPanel?.webview.postMessage({
      type: 'update',
      html: `
        <div>User: ${text}</div>
        <div>System: ${response}</div>
      `
    });
  }

  openMenu(): void {
    // Implement menu UI
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');
    this.logger.debug('ChatService: Disposing...');
    
    if (this.chatPanel) {
      this.chatPanel.dispose();
    }
    
    this.state.isDisposed = true;
    this.logger.debug('ChatService: Disposed');
  }
}
