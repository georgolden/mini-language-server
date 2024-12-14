import fs from 'node:fs';
import path from 'node:path';
import ignoreLib, { type Ignore } from 'ignore';

const ignore = ignoreLib.default;

const readFileAsync = fs.promises.readFile;
const readdirAsync = fs.promises.readdir;
const statAsync = fs.promises.stat;

/**
 * Gets all files in a directory and its subdirectories, respecting .gitignore rules
 * @param dirPath - The root directory to start searching from
 * @param baseDir - The base directory for relative path calculation (defaults to dirPath)
 * @returns Promise resolving to an array of relative file paths
 */
export async function getAllFiles(dirPath: string, baseDir: string = dirPath): Promise<string[]> {
  let ig: Ignore;
  try {
    const gitignoreContent = await readFileAsync(path.join(baseDir, '.gitignore'), 'utf8');
    ig = ignore().add(gitignoreContent);
  } catch {
    ig = ignore();
  }

  ig.add('.git/**');

  async function crawl(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdirAsync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relativePath = path.relative(baseDir, fullPath);

      if (ig.ignores(relativePath)) continue;

      const stat = await statAsync(fullPath);

      if (stat.isDirectory()) {
        files.push(...(await crawl(fullPath)));
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }

  return crawl(dirPath);
}

export async function getFileContent(relativePath: string, dir = ''): Promise<string> {
  const filePath = path.resolve(dir, relativePath);

  const content = await readFileAsync(filePath, 'utf8');

  return content;
}
