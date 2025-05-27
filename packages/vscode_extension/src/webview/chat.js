function chatApp() {
  return {
    messages: [],
    currentMessage: '',
    isTyping: false,
    vscode: null,

    init() {
      this.vscode = acquireVsCodeApi();
      
      // Apply VSCode theme class to body for conditional styling
      document.body.className = document.body.className + ' vscode-theme';
      
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
          case 'addMessage':
            this.addMessage(message.content, message.role, message.messageType);
            break;
          case 'setTyping':
            this.isTyping = message.typing;
            break;
          case 'clearMessages':
            this.messages = [];
            break;
          case 'loadHistory':
            this.messages = message.messages || [];
            break;
          case 'themeChanged':
            this.handleThemeChange(message.theme);
            break;
        }
      });

      // Load existing chat history
      this.vscode.postMessage({ type: 'requestHistory' });
    },

    sendMessage() {
      if (!this.currentMessage.trim() || this.isTyping) return;
      
      this.addMessage(this.currentMessage, 'user');
      
      this.vscode.postMessage({ 
        type: 'message', 
        text: this.currentMessage 
      });
      
      this.currentMessage = '';
      this.isTyping = true;
      this.scrollToBottom();
    },

    addMessage(content, role, messageType = 'normal') {
      this.messages.push({
        id: Date.now() + Math.random(),
        content: this.escapeHtml(content),
        role: role,
        type: messageType, // 'normal', 'error', 'warning', 'info'
        timestamp: new Date()
      });
      this.$nextTick(() => this.scrollToBottom());
    },

    handleThemeChange(theme) {
      // Optional: Add any theme-specific JavaScript logic here
      console.log('Theme changed to:', theme);
    },

    scrollToBottom() {
      this.$refs.history.scrollTop = this.$refs.history.scrollHeight;
    },

    clearChat() {
      this.messages = [];
      this.vscode.postMessage({ type: 'clearChat' });
    },

    exportChat() {
      const chatData = this.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      this.vscode.postMessage({ type: 'exportChat', data: chatData });
    },

    formatTime(date) {
      return new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
}