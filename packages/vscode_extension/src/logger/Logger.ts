import { OutputChannel, window } from 'vscode';

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  dispose(): void;
}

export class Logger implements ILogger {
  private readonly channel: OutputChannel;

  constructor(name: string) {
    this.channel = window.createOutputChannel(name);
  }

  debug(message: string): void {
    this.channel.appendLine(`[DEBUG] ${message}`);
  }

  info(message: string): void {
    this.channel.appendLine(`[INFO] ${message}`);
  }

  warn(message: string): void {
    this.channel.appendLine(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.channel.appendLine(`[ERROR] ${message}`);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
