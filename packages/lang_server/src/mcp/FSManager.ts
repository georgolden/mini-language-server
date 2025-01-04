import fs from 'node:fs';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import ignoreLib, { type Ignore } from 'ignore';
import type { IFSManager, FileInfo } from './interfaces/FSManager.js';

const ignore = ignoreLib.default;

const readFileAsync = fs.promises.readFile;
const readdirAsync = fs.promises.readdir;
const statAsync = fs.promises.stat;

export class FSManager implements IFSManager {
  async getAllFiles(dirPath: string, baseDir: string = dirPath): Promise<FileInfo[]> {
    let ig: Ignore;
    try {
      const gitignoreContent = await readFileAsync(path.join(baseDir, '.gitignore'), 'utf8');
      ig = ignore().add(gitignoreContent);
    } catch {
      ig = ignore();
    }

    ig.add('.git/**');

    async function crawl(dir: string): Promise<FileInfo[]> {
      const files: FileInfo[] = [];
      const entries = await readdirAsync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(baseDir, fullPath);

        if (ig.ignores(relativePath)) continue;

        const stat = await statAsync(fullPath);

        if (stat.isDirectory()) {
          files.push(...(await crawl(fullPath)));
        } else {
          const content = await readFileAsync(fullPath, 'utf8');
          const parsedPath = path.parse(fullPath);
          files.push({
            fileName: parsedPath.name,
            ext: parsedPath.ext,
            fullName: parsedPath.base,
            content,
            path: fullPath,
          });
        }
      }

      return files;
    }

    return crawl(dirPath);
  }

  async getFile(filePath: string, dir: string = ''): Promise<FileInfo> {
    const fullPath = path.resolve(dir, filePath);
    const content = await readFileAsync(fullPath, 'utf8');
    const parsedPath = path.parse(fullPath);

    return {
      fileName: parsedPath.name,
      ext: parsedPath.ext,
      fullName: parsedPath.base,
      content,
      path: fullPath,
    };
  }

  async insertCode(input: {
    replace: boolean;
    code: string;
    filePath: string;
    position: {
      startRow: number;
      startColumn: number;
      endRow: number;
      endColumn: number;
    };
  }): Promise<void> {
    const dirPath = path.dirname(input.filePath);
    await mkdir(dirPath, { recursive: true });

    if (input.position.startRow === 0 && input.position.startColumn === 0 && input.replace) {
      await writeFile(input.filePath, input.code);
      return;
    }

    let fileContent = '';
    try {
      await access(input.filePath);
      fileContent = await readFileAsync(input.filePath, 'utf-8');
    } catch {
      await writeFile(input.filePath, '');
    }

    let lines = fileContent.split('\n');

    while (lines.length <= input.position.startRow) {
      lines.push('');
    }

    if (
      input.position.startRow === input.position.endRow &&
      input.position.startColumn === input.position.endColumn
    ) {
      const line = lines[input.position.startRow] || '';
      const baseIndent = this.getLineIndentation(line);

      const codeLines = input.code.split('\n').map((codeLine, index) => {
        return index === 0 ? codeLine : ' '.repeat(baseIndent) + codeLine;
      });

      lines[input.position.startRow] =
        line.slice(0, input.position.startColumn) +
        codeLines.join('\n') +
        line.slice(input.position.startColumn);
    } else if (input.replace) {
      const beforeContent = lines.slice(0, input.position.startRow);
      const afterContent = lines.slice(input.position.endRow + 1);
      const startLine = lines[input.position.startRow] || '';
      const endLine = lines[input.position.endRow] || '';
      const baseIndent = this.getLineIndentation(startLine);

      const newCode = input.code.split('\n').map((codeLine, index) => {
        if (index === 0) return startLine.slice(0, input.position.startColumn) + codeLine;
        return ' '.repeat(baseIndent) + codeLine;
      });

      if (newCode.length > 0) {
        newCode[newCode.length - 1] += endLine.slice(input.position.endColumn);
      }

      lines = [...beforeContent, ...newCode, ...afterContent];
    }

    await writeFile(input.filePath, lines.join('\n'));
  }

  async createFile(filePath: string) {
    try {
      await fs.promises.writeFile(filePath, '');

      const parsedPath = path.parse(filePath);

      return {
        fileName: parsedPath.name,
        ext: parsedPath.ext,
        fullName: parsedPath.base,
        content: '',
        path: filePath,
      };
    } catch (error: any) {
      throw new Error(`Failed to create file: ${error?.message}`);
    }
  }

  private getLineIndentation(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[0].length : 0;
  }
}
