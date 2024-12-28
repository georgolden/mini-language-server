export interface IFSManager {
  getAllFiles(dirPath: string, baseDir?: string): Promise<string[]>;
  getFileContent(relativePath: string, dir?: string): Promise<string>;
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
