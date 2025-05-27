import * as vscode from 'vscode';
import * as path from 'path';
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
  private chatHistory: Array<{id: string, content: string, role: string, timestamp: Date}> = [];
  
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
        { 
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(this.deps.context.extensionPath, 'src', 'webview'))
          ]
        }
      );

      this.chatPanel.webview.html = ChatView.render(this.deps.context, this.chatPanel.webview);
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
          case 'clearChat':
            this.chatHistory = [];
            break;
          case 'requestHistory':
            this.sendChatHistory();
            break;
          case 'exportChat':
            this.exportChat(message.data);
            break;
        }
      },
      undefined,
      this.deps.context.subscriptions
    );
  }

  private async sendChatHistory(): Promise<void> {
    await this.chatPanel?.webview.postMessage({
      type: 'loadHistory',
      messages: this.chatHistory
    });
  }

  private async exportChat(chatData: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('chat-export.txt'),
      filters: { 'Text files': ['txt'] }
    });
    
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(chatData));
      vscode.window.showInformationMessage('Chat exported successfully!');
    }
  }

  async handleChatMessage(text: string): Promise<void> {
    // Add user message to history
    const userMessage = {
      id: Date.now() + '-user',
      content: text,
      role: 'user',
      timestamp: new Date()
    };
    this.chatHistory.push(userMessage);

    // Set typing indicator
    await this.chatPanel?.webview.postMessage({
      type: 'setTyping',
      typing: true
    });

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = `Processed: ${text}`;
    
    // Add system message to history
    const systemMessage = {
      id: Date.now() + '-system',
      content: response,
      role: 'system',
      timestamp: new Date()
    };
    this.chatHistory.push(systemMessage);

    // Send system message
    await this.chatPanel?.webview.postMessage({
      type: 'addMessage',
      content: response,
      role: 'system'
    });

    // Clear typing indicator
    await this.chatPanel?.webview.postMessage({
      type: 'setTyping',
      typing: false
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
