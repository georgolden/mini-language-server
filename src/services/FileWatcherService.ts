import { readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { IService, ServiceDependencies, ServiceState } from './types';
import { ILogger } from '../logger/Logger';

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

interface FileWatcherDeps extends ServiceDependencies {
  workspacePath: string;
}

export class FileWatcherService extends EventEmitter implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  public readonly files: Map<string, FileInfo>;
  private watchers: vscode.FileSystemWatcher[] = [];
  
  private readonly logger: ILogger;
  private readonly workspacePath: string;

  constructor(deps: FileWatcherDeps) {
    super();
    this.logger = deps.logger;
    this.workspacePath = deps.workspacePath;
    this.files = new Map();
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
    this.logger.debug('FileWatcherService: Initializing...');

    // Initial file load
    const pattern = path.join(this.workspacePath, '**/*.{js,jsx,ts,tsx}');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'],
      absolute: true,
    });

    this.logger.debug(`FileWatcherService: Found ${files.length} files to load`);

    for (const filePath of files) {
      await this.loadFile(filePath);
    }

    // Set up file system watchers for different extensions
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    
    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.workspacePath, pattern)
      );

      watcher.onDidCreate(async (uri) => {
        this.logger.debug(`FileWatcherService: File created: ${uri.fsPath}`);
        await this.loadFile(uri.fsPath);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.emit('add', { type: 'add', file: fileInfo });
        }
      });

      watcher.onDidChange(async (uri) => {
        this.logger.debug(`FileWatcherService: File changed: ${uri.fsPath}`);
        await this.loadFile(uri.fsPath);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.emit('change', { type: 'change', file: fileInfo });
        }
      });

      watcher.onDidDelete((uri) => {
        this.logger.debug(`FileWatcherService: File deleted: ${uri.fsPath}`);
        const fileInfo = this.files.get(uri.fsPath);
        if (fileInfo) {
          this.files.delete(uri.fsPath);
          this.emit('unlink', { type: 'unlink', file: fileInfo });
        }
      });

      this.watchers.push(watcher);
    }

    this.state.isInitialized = true;
    this.logger.debug('FileWatcherService: Initialization complete');
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
      this.logger.debug(`FileWatcherService: Loaded file ${fileInfo.fullName}`);
    } catch (error) {
      this.logger.error(`FileWatcherService: Error loading file ${filePath}: ${error}`);
    }
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    this.assertState('updateFile');
    await this.loadFile(filePath);
    const fileInfo = this.files.get(filePath);
    if (fileInfo) {
      fileInfo.content = content;
      this.emit('change', { type: 'change', file: fileInfo });
    }
  }

  async dispose(): Promise<void> {
    this.assertState('dispose');
    this.logger.debug('FileWatcherService: Disposing...');
    
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    
    this.watchers = [];
    this.files.clear();
    this.removeAllListeners();
    
    this.state.isDisposed = true;
    this.logger.debug('FileWatcherService: Disposed');
  }
}
