import { 
    Connection,
    DidChangeWatchedFilesParams,
    FileChangeType,
    FileEvent,
  } from 'vscode-languageserver/node';
  import { TextDocument } from 'vscode-languageserver-textdocument';
  import { URI } from 'vscode-uri';
  import { readFile } from 'fs/promises';
  import { glob } from 'glob';
  import * as path from 'path';
  import { 
    FileInfo, 
    WorkspaceManagerDeps,
    IWorkspaceManager, 
    FileChangeEvent 
  } from './types';
  
  export class WorkspaceManager implements IWorkspaceManager {
    private readonly connection: Connection;
    private readonly workspaceFolders: string[];
    private files: Map<string, FileInfo>;
  
    constructor(deps: WorkspaceManagerDeps) {
      this.connection = deps.connection;
      this.workspaceFolders = deps.workspaceFolders.map(folder => URI.parse(folder.uri).fsPath);
      this.files = new Map();
      this.connection.console.info('WorkspaceManager: Created with workspace folders:');
      this.workspaceFolders.forEach(folder => {
        this.connection.console.info(`  - ${folder}`);
      });
    }
  
    async initialize(): Promise<void> {
      this.connection.console.info('WorkspaceManager: Starting initialization...');
  
      try {
        let totalFiles = 0;
        // Load all files initially
        for (const workspacePath of this.workspaceFolders) {
          this.connection.console.info(`WorkspaceManager: Loading files from ${workspacePath}`);
          const loadedCount = await this.loadWorkspaceFiles(workspacePath);
          totalFiles += loadedCount;
        }
  
        this.connection.console.info(
          `WorkspaceManager: Initialization complete. Loaded ${totalFiles} files in total.`
        );
        this.connection.console.info('WorkspaceManager: File watcher is now active and monitoring for changes.');
      } catch (error) {
        this.connection.console.error(
          `WorkspaceManager: Initialization failed with error: ${error}`
        );
        throw error;
      }
    }
  
    public handleWatchedFilesChange(params: DidChangeWatchedFilesParams): void {
      this.connection.console.info(`WorkspaceManager: Received ${params.changes.length} file change events`);
      
      for (const change of params.changes) {
        const filePath = URI.parse(change.uri).fsPath;
        const changeType = this.getChangeTypeString(change.type);
        
        this.connection.console.info(
          `WorkspaceManager: Processing ${changeType} event for file: ${filePath}`
        );
        
        switch (change.type) {
          case FileChangeType.Created:
            this.handleFileCreated(filePath);
            break;
          
          case FileChangeType.Changed:
            this.handleFileChanged(filePath);
            break;
          
          case FileChangeType.Deleted:
            this.handleFileDeleted(filePath);
            break;
        }
      }
    }
  
    private getChangeTypeString(type: number): string {
      switch (type) {
        case FileChangeType.Created: return 'Created';
        case FileChangeType.Changed: return 'Changed';
        case FileChangeType.Deleted: return 'Deleted';
        default: return 'Unknown';
      }
    }
  
    private async loadWorkspaceFiles(workspacePath: string): Promise<number> {
      const pattern = path.join(workspacePath, '**/*.{ts,tsx,js,jsx}');
      this.connection.console.info(`WorkspaceManager: Searching for files with pattern: ${pattern}`);
      
      const files = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'],
        absolute: true,
      });
  
      this.connection.console.info(
        `WorkspaceManager: Found ${files.length} files matching pattern in ${workspacePath}`
      );
  
      let loadedCount = 0;
      for (const filePath of files) {
        if (await this.loadFile(filePath)) {
          loadedCount++;
        }
      }
  
      this.connection.console.info(
        `WorkspaceManager: Successfully loaded ${loadedCount} files from ${workspacePath}`
      );
      return loadedCount;
    }
  
    private shouldHandleFile(filePath: string): boolean {
      const ext = path.extname(filePath);
      const should = ['.ts', '.tsx', '.js', '.jsx'].includes(ext) &&
             !filePath.includes('node_modules') &&
             !filePath.includes('dist') &&
             !filePath.includes('build') &&
             !filePath.includes('out');
  
      if (!should) {
        this.connection.console.info(
          `WorkspaceManager: Skipping file ${filePath} (doesn't match criteria)`
        );
      }
      return should;
    }
  
    private async loadFile(filePath: string): Promise<boolean> {
      if (!this.shouldHandleFile(filePath)) {
        return false;
      }
  
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
        this.connection.console.info(
          `WorkspaceManager: Loaded file ${fileInfo.fullName} (${content.length} bytes)`
        );
        
        this.notifyFileChange('create', fileInfo);
        return true;
      } catch (error) {
        this.connection.console.error(
          `WorkspaceManager: Failed to load file ${filePath}: ${error}`
        );
        return false;
      }
    }
  
    private async handleFileCreated(filePath: string): Promise<void> {
      this.connection.console.info(`WorkspaceManager: Handling file creation: ${filePath}`);
      if (this.shouldHandleFile(filePath)) {
        if (await this.loadFile(filePath)) {
          this.connection.console.info(`WorkspaceManager: Successfully loaded new file: ${filePath}`);
        }
      }
    }
  
    private async handleFileChanged(filePath: string): Promise<void> {
      this.connection.console.info(`WorkspaceManager: Handling file change: ${filePath}`);
      if (this.shouldHandleFile(filePath)) {
        if (await this.loadFile(filePath)) {
          const fileInfo = this.files.get(filePath);
          if (fileInfo) {
            this.connection.console.info(`WorkspaceManager: Successfully reloaded changed file: ${filePath}`);
            this.notifyFileChange('change', fileInfo);
          }
        }
      }
    }
  
    private handleFileDeleted(filePath: string): void {
      this.connection.console.info(`WorkspaceManager: Handling file deletion: ${filePath}`);
      const fileInfo = this.files.get(filePath);
      if (fileInfo) {
        this.files.delete(filePath);
        this.connection.console.info(`WorkspaceManager: Removed deleted file from cache: ${filePath}`);
        this.notifyFileChange('delete', fileInfo);
      }
    }
  
    private notifyFileChange(type: 'create' | 'change' | 'delete', file: FileInfo): void {
      const event: FileChangeEvent = { type, file };
      this.connection.sendNotification('custom/fileChange', event);
      this.connection.console.info(
        `WorkspaceManager: Sent '${type}' notification for ${file.fullName}`
      );
    }
  
    getFile(path: string): FileInfo | undefined {
      return this.files.get(path);
    }
  
    getAllFiles(): Map<string, FileInfo> {
      return new Map(this.files);
    }
  }
