export class ChatView {
  private static getWebviewContent() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${ChatView.getStyles()}
        </head>
        <body>
          ${ChatView.getHtmlContent()}
          ${ChatView.getScripts()}
        </body>
      </html>
    `;
  }

  private static getStyles() {
    return `
      <style>
        body { 
          display: flex;
          flex-direction: column;
          height: 100vh;
          margin: 0;
          padding: 10px;
        }
        #chat-history {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 10px;
          padding: 10px;
          border: 1px solid var(--vscode-input-border);
        }
        #input-container {
          display: flex;
          gap: 8px;
        }
        #message-input {
          flex: 1;
          padding: 8px;
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          color: var(--vscode-input-foreground);
        }
        button {
          padding: 8px 16px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
        }
      </style>
    `;
  }

  private static getHtmlContent() {
    return `
      <div id="chat-history"></div>
      <div id="input-container">
        <input type="text" id="message-input" placeholder="Type your message...">
        <button id="send-button">Send</button>
      </div>
    `;
  }

  private static getScripts() {
    return `
      <script>
        const vscode = acquireVsCodeApi();
        const input = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const history = document.getElementById('chat-history');

        function sendMessage() {
          const text = input.value.trim();
          if (text) {
            vscode.postMessage({ type: 'message', text });
            input.value = '';
          }
        }

        // Add message handler
        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.type) {
            case 'update':
              history.innerHTML += message.html;
              history.scrollTop = history.scrollHeight;
              break;
          }
        });

        sendButton.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      </script>
    `;
  }
  static render(): string {
    return ChatView.getWebviewContent();
  }
}
