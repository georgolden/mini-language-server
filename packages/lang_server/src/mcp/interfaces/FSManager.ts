export interface FileInfo {
  fileName: string;
  ext: string;
  fullName: string;
  content: string;
  path: string;
}

export interface IFSManager {
  getAllFiles(dirPath?: string, baseDir?: string): Promise<FileInfo[]>;
  getFile(path: string, dir?: string): Promise<FileInfo>;
  createFile(path: string): Promise<FileInfo>;
  insertCode(input: {
    replace: boolean;
    code: string;
    filePath: string;
    position: {
      startRow: number;
      startColumn: number;
      endRow: number;
      endColumn: number;
    };
  }): Promise<void>;
}
