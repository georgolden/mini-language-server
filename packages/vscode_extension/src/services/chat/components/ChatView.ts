import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ChatView {
  static render(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const webviewPath = path.join(context.extensionPath, 'src', 'webview');
    
    // Read the HTML file
    const htmlPath = path.join(webviewPath, 'chat.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Convert local resource paths to webview URIs
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewPath, 'styles.css')));
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewPath, 'chat.js')));
    
    // Replace relative paths with webview URIs
    html = html.replace('./styles.css', styleUri.toString());
    html = html.replace('./chat.js', scriptUri.toString());
    
    return html;
  }
}
