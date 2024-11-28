import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import * as path from 'path';
import { ASTDependencyAnalyzer } from './ASTDependencyAnalyzer';

const TEST_DIR = 'test-files';

async function setupTestFiles() {
  await mkdir(TEST_DIR, { recursive: true });

  const sourceFile = `
import { Logger } from './logger';
import { Config } from './config';
import * as utils from './utils';

export class TestService {
  private logger: Logger;
  private config: Config;
  
  constructor(logger: Logger, config: Config) {
    this.logger = logger;
    this.config = config;
    this.setupUtils();
  }
  
  private setupUtils() {
    utils.initialize(this.config);
  }

  async process(data: ProcessConfig): Promise<Result> {
    const validator = new Validator();
    return validator.validate(data);
  }
}

interface ProcessConfig {
  timeout: number;
  validator?: Validator;
}

class Validator {
  validate(data: ProcessConfig): Result {
    return { success: true };
  }
}

interface Result {
  success: boolean;
}`;

  const filePath = path.resolve(TEST_DIR, 'source.ts');
  await writeFile(filePath, sourceFile);
  return filePath;
}

async function cleanupTestFiles() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe('findChunkDependencies', async () => {
  test('should find all dependencies in class scope', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const sourceCode = await readFile(filePath, 'utf-8');
      const tree = analyzer.parser.parse(sourceCode);

      // Get class chunk first
      const chunk = await analyzer.extractCodeChunk(tree, 'TestService', filePath);
      assert.ok(chunk, 'Should extract class chunk');

      // Find dependencies
      const dependencies = analyzer.findChunkDependencies(tree, chunk.position);

      // External types & classes
      assert.ok(dependencies.has('Logger'), 'Should find Logger type');
      assert.ok(dependencies.has('Config'), 'Should find Config type');
      assert.ok(dependencies.has('utils'), 'Should find utils namespace');
      assert.ok(dependencies.has('ProcessConfig'), 'Should find ProcessConfig interface');
      assert.ok(dependencies.has('Result'), 'Should find Result type');
      assert.ok(dependencies.has('Validator'), 'Should find Validator class');

      // Should NOT include
      assert.ok(!dependencies.has('TestService'), 'Should not include self');
      assert.ok(!dependencies.has('setupUtils'), 'Should not include own methods');
      assert.ok(!dependencies.has('process'), 'Should not include own methods');
      assert.ok(!dependencies.has('this'), 'Should not include this keyword');
      assert.ok(!dependencies.has('Promise'), 'Should not include built-in types');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should find dependencies in interface', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const chunk = await analyzer.extractCodeChunk(tree, 'ProcessConfig', filePath);
      assert.ok(chunk, 'Should extract interface chunk');

      const dependencies = analyzer.findChunkDependencies(tree, chunk.position);

      assert.ok(dependencies.has('Validator'), 'Should find Validator reference');
      assert.ok(!dependencies.has('number'), 'Should not include primitive types');
      assert.ok(!dependencies.has('timeout'), 'Should not include property names');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should find dependencies in type alias with generics', async (t) => {
    const filePath = await setupTestFiles();
    await writeFile(
      filePath,
      `
  export type Handler<T extends BaseConfig> = (data: T, logger: Logger) => Promise<Result>;
  
  interface BaseConfig {
    type: string;
  }
  
  interface Logger {
    log(msg: string): void;
  }
  
  interface Result {
    success: boolean;
  }`,
    );

    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const chunk = await analyzer.extractCodeChunk(tree, 'Handler', filePath);
      assert.ok(chunk, 'Should extract type alias chunk');

      const dependencies = analyzer.findChunkDependencies(tree, chunk.position);

      assert.strictEqual(dependencies.size, 3, 'Should find exactly three dependencies');
      assert.ok(dependencies.has('BaseConfig'), 'Should find BaseConfig type');
      assert.ok(dependencies.has('Logger'), 'Should find Logger type');
      assert.ok(dependencies.has('Result'), 'Should find Result type');
      assert.ok(!dependencies.has('Handler'), 'Should not include self');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should find dependencies in nested function types', async (t) => {
    const filePath = await setupTestFiles();
    await writeFile(
      filePath,
      `
  export type Middleware = {
    before: (ctx: Context) => Promise<void>;
    after: (ctx: Context, result: Result) => Promise<void>;
  };
  
  interface Context {
    logger: Logger;
    config: Config;
  }
  
  interface Logger {
    log(msg: string): void;
  }
  
  interface Config {
    timeout: number;
  }
  
  interface Result {
    success: boolean;
  }`,
    );

    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const chunk = await analyzer.extractCodeChunk(tree, 'Middleware', filePath);
      assert.ok(chunk, 'Should extract type alias chunk');

      const dependencies = analyzer.findChunkDependencies(tree, chunk.position);

      assert.strictEqual(dependencies.size, 2, 'Should find exactly two dependencies');
      assert.ok(dependencies.has('Context'), 'Should find Context type');
      assert.ok(dependencies.has('Result'), 'Should find Result type');
      assert.ok(!dependencies.has('Promise'), 'Should not include built-in types');
    } finally {
      await cleanupTestFiles();
    }
  });
});
