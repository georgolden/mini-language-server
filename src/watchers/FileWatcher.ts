import { readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';

export interface FileInfo {
  fileName: string;   
  ext: string;       
  fullName: string;  
  content: string;   
  path: string;      
}

export type FileEvent = 'add' | 'change' | 'unlink';

export interface FileChange {
  type: FileEvent;
  file: FileInfo;
}

export class FileWatcher extends EventEmitter {
  private files: Map<string, FileInfo> = new Map();
  private watchers: vscode.FileSystemWatcher[] = [];
  private readonly workspacePath: string;
  private debug: (message: string) => void;

  constructor(workspacePath: string, debug: (message: string) => void) {
    super();
    this.workspacePath = workspacePath;
    this.debug = debug;
  }

  async initialize(): Promise<Map<string, FileInfo>> {
    this.debug('FileWatcher: Initializing...');

    // Initial file load
    const pattern = path.join(this.workspacePath, '**/*.{js,jsx,ts,tsx}');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'],
      absolute: true,
    });

    this.debug(`FileWatcher: Found ${files.length} files to load`);

    for (const filePath of files) {
      await this.loadFile(filePath);
    }

    // Set up file system watchers for different extensions
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    
    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.workspacePath, pattern),
        false, // Don't ignore creates
        false, // Don't ignore changes
        false  // Don't ignore deletes
      );

      watcher.onDidCreate(async (uri) => {
        this.debug(`FileWatcher: File created: ${uri.fsPath}`);
        await this.loadFile(uri.fsPath);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.emit('add', { type: 'add', file: fileInfo });
        }
      });

      watcher.onDidChange(async (uri) => {
        this.debug(`FileWatcher: File changed: ${uri.fsPath}`);
        await this.loadFile(uri.fsPath);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.emit('change', { type: 'change', file: fileInfo });
        }
      });

      watcher.onDidDelete((uri) => {
        this.debug(`FileWatcher: File deleted: ${uri.fsPath}`);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.files.delete(uri.fsPath);
          this.emit('unlink', { type: 'unlink', file: fileInfo });
        }
      });

      this.watchers.push(watcher);
    }

    this.debug('FileWatcher: Initialization complete');
    return this.files;
  }

  private async loadFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsedPath = path.parse(filePath);
      
      const fileInfo: FileInfo = {
        fileName: parsedPath.name,
        ext: parsedPath.ext,
        fullName: parsedPath.base,
        content,
        path: filePath,
      };

      this.files.set(filePath, fileInfo);
      this.debug(`FileWatcher: Loaded file ${fileInfo.fullName}`);
    } catch (error) {
      this.debug(`FileWatcher: Error loading file ${filePath}: ${error}`);
    }
  }

  async dispose(): Promise<void> {
    this.debug('FileWatcher: Disposing...');
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
    this.files.clear();
    this.removeAllListeners();
    this.debug('FileWatcher: Disposed');
  }

  getAllFiles(): FileInfo[] {
    return Array.from(this.files.values());
  }

  getFile(filePath: string): FileInfo | undefined {
    return this.files.get(filePath);
  }
}
