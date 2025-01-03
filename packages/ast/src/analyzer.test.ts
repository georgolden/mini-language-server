import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import * as path from 'path';
import { ASTDependencyAnalyzer } from './ASTDependencyAnalyzer.js';

const TEST_DIR = 'test-files';

interface TestFiles {
  mainPath: string;
  typesPath: string;
  servicePath: string;
  utilsPath: string;
}

async function setupTestFiles(): Promise<TestFiles> {
  await mkdir(`${TEST_DIR}/services`, { recursive: true });
  await mkdir(`${TEST_DIR}/types`, { recursive: true });
  await mkdir(`${TEST_DIR}/utils`, { recursive: true });

  const mainFile = `
import { Command, CommandHandler } from './types';
import { InputBoxService } from './services/InputBoxService';
import { asyncHelper } from './utils/helpers';

export function createInputBoxCommands(inputBoxService: InputBoxService): Command[] {
  const handler: CommandHandler = async () => {
    await asyncHelper();
    inputBoxService.showInputBox();
  };

  return [{
    id: 'miniLanguageServer.showInputBox',
    title: 'Show Input Box',
    handler
  }];
}`;

  const typesFile = `
export interface Command {
  id: string;
  title: string;
  handler: CommandHandler;
}

export type CommandHandler = () => Promise<void>;`;

  const serviceFile = `
import { Logger } from '../utils/helpers';

export class InputBoxService {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  showInputBox(): void {
    this.logger.log('Showing input box');
  }
}`;

  const utilsFile = `
export interface Logger {
  log(message: string): void;
}

export async function asyncHelper(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 100));
}`;

  const paths = {
    mainPath: path.resolve(TEST_DIR, 'main.ts'),
    typesPath: path.resolve(TEST_DIR, 'types/index.ts'),
    servicePath: path.resolve(TEST_DIR, 'services/InputBoxService.ts'),
    utilsPath: path.resolve(TEST_DIR, 'utils/helpers.ts'),
  };

  await writeFile(paths.mainPath, mainFile);
  await writeFile(paths.typesPath, typesFile);
  await writeFile(paths.servicePath, serviceFile);
  await writeFile(paths.utilsPath, utilsFile);

  return paths;
}

async function cleanupTestFiles() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe('ASTDependencyAnalyzer', async () => {
  test('should find class definition in imported file', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('InputBoxService', paths.mainPath);
      console.dir({ result });
      assert.ok(result, 'Should find class definition');
      assert.ok(result.filePath.endsWith('InputBoxService.ts'), 'Should resolve to correct file');

      // Position assertions
      assert.ok(result.position.start.line >= 0, 'Start line should be non-negative');
      assert.ok(result.position.end.line >= 0, 'End line should be non-negative');
      assert.ok(
        result.position.start.offset < result.position.end.offset,
        'Start offset should be less than end offset',
      );

      // Content verification
      const fileContent = await readFile(result.filePath, 'utf-8');
      const definitionSnippet = fileContent.substring(
        result.position.start.offset,
        result.position.end.offset,
      );
      assert.ok(
        definitionSnippet.includes('InputBoxService'),
        'Definition should contain class name',
      );
      assert.ok(definitionSnippet.includes('export'), 'Definition should include export keyword');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should find interface definition', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('Command', paths.mainPath);

      assert.ok(result, 'Should find interface definition');
      assert.ok(result.filePath.endsWith('index.ts'), 'Should resolve to types file');

      const fileContent = await readFile(result.filePath, 'utf-8');
      const definitionSnippet = fileContent.substring(
        result.position.start.offset,
        result.position.end.offset,
      );
      assert.ok(
        definitionSnippet.includes('interface Command'),
        'Should find interface definition',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should find function definition', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('asyncHelper', paths.mainPath);

      assert.ok(result, 'Should find function definition');
      assert.ok(result.filePath.endsWith('helpers.ts'), 'Should resolve to utils file');

      const fileContent = await readFile(result.filePath, 'utf-8');
      const definitionSnippet = fileContent.substring(
        result.position.start.offset,
        result.position.end.offset,
      );
      assert.ok(
        definitionSnippet.includes('function asyncHelper'),
        'Should find function definition',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle type import', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('CommandHandler', paths.mainPath);

      assert.ok(result, 'Should find type definition');
      assert.ok(result.filePath.endsWith('index.ts'), 'Should resolve to types file');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle re-exported identifiers', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('Logger', paths.servicePath);

      assert.ok(result, 'Should find interface definition through re-export');
      assert.ok(result.filePath.endsWith('helpers.ts'), 'Should resolve to utils file');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle import with extension', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    // Add a file with explicit extension in import
    await writeFile(
      `${TEST_DIR}/with-extension.ts`,
      `
      import { InputBoxService } from './services/InputBoxService.ts';
    `,
    );

    try {
      const result = await analyzer.findIdentifierDefinition(
        'InputBoxService',
        path.resolve(TEST_DIR, 'with-extension.ts'),
      );

      assert.ok(result, 'Should handle import with extension');
      assert.ok(result.filePath.endsWith('InputBoxService.ts'), 'Should resolve to correct file');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle non-existent identifier', async (t) => {
    const paths = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition('NonExistentService', paths.mainPath);

      assert.strictEqual(result, null, 'Should return null for non-existent identifier');
    } finally {
      await cleanupTestFiles();
    }
  });
});
