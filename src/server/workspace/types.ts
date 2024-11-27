import { Connection, WorkspaceFolder } from 'vscode-languageserver/node';

export interface FileInfo {
  fileName: string;
  ext: string;
  fullName: string;
  content: string;
  path: string;
}

export interface WorkspaceManagerDeps {
  connection: Connection;
  workspaceFolders: WorkspaceFolder[];
}

export interface IWorkspaceManager {
  initialize(): Promise<void>;
  getFile(path: string): FileInfo | undefined;
  getAllFiles(): Map<string, FileInfo>;
}

export type FileChangeType = 'create' | 'change' | 'delete';

export interface FileChangeEvent {
  type: FileChangeType;
  file: FileInfo;
}
