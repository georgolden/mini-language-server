import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import * as path from 'path';
import { ASTDependencyAnalyzer } from './ASTDependencyAnalyzer.js';

const TEST_DIR = 'test-files';

async function setupTestFiles() {
  await mkdir(TEST_DIR, { recursive: true });

  const sourceFile = `
// Simple class
export class TestService {
  private field: string;
  
  constructor() {
    this.field = 'test';
  }
  
  doSomething(): void {
    console.log(this.field);
  }
}

// Interface
export interface Config {
  timeout: number;
  retries: number;
}

// Function
export function processData(input: string): string[] {
  return input.split(',');
}

// Type alias
export type Handler = (data: unknown) => void;

// Constant with type
export const DEFAULT_TIMEOUT: number = 1000;

// Enum
export enum LogLevel {
  INFO,
  ERROR
}`;

  const filePath = path.resolve(TEST_DIR, 'source.ts');
  await writeFile(filePath, sourceFile);
  return filePath;
}

async function cleanupTestFiles() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe('extractCodeChunk', async () => {
  test('should extract class definition with methods', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'TestService', filePath);

      assert.ok(result, 'Should extract class chunk');

      const expectedCode = `export class TestService {
  private field: string;
  
  constructor() {
    this.field = 'test';
  }
  
  doSomething(): void {
    console.log(this.field);
  }
}`;

      assert.strictEqual(
        result.sourceCode.trim(),
        expectedCode.trim(),
        'Should extract complete class definition',
      );

      // Position checks
      assert.ok(result.position.start.offset < result.position.end.offset, 'Valid position range');
      assert.strictEqual(
        result.sourceCode,
        (await readFile(filePath, 'utf-8')).substring(
          result.position.start.offset,
          result.position.end.offset,
        ),
        'Position should match the exact code',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should extract interface definition', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'Config', filePath);

      assert.ok(result, 'Should extract interface chunk');

      const expectedCode = `export interface Config {
  timeout: number;
  retries: number;
}`;

      assert.strictEqual(
        result.sourceCode.trim(),
        expectedCode.trim(),
        'Should extract complete interface definition',
      );
    } finally {
      await cleanupTestFiles();
    }
  });
  test('should extract type alias definition', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'Handler', filePath);

      assert.ok(result, 'Should extract type alias chunk');

      const expectedCode = 'export type Handler = (data: unknown) => void;';

      assert.strictEqual(
        result.sourceCode.trim(),
        expectedCode.trim(),
        'Should extract complete type alias definition',
      );

      // Position verification
      const fileContent = await readFile(filePath, 'utf-8');
      assert.strictEqual(
        result.sourceCode,
        fileContent.substring(result.position.start.offset, result.position.end.offset),
        'Position should match exact code range',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should extract constant with type', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'DEFAULT_TIMEOUT', filePath);

      assert.ok(result, 'Should extract constant chunk');
      const expectedCode = 'export const DEFAULT_TIMEOUT: number = 1000;';

      assert.strictEqual(
        result.sourceCode.trim(),
        expectedCode.trim(),
        'Should extract complete constant definition',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should extract enum definition', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'LogLevel', filePath);

      assert.ok(result, 'Should extract enum chunk');

      // Check essential parts instead of exact match
      assert.ok(
        result.sourceCode.includes('export enum LogLevel'),
        'Should include enum declaration',
      );
      assert.ok(result.sourceCode.includes('INFO'), 'Should include first enum member');
      assert.ok(result.sourceCode.includes('ERROR'), 'Should include second enum member');
      assert.ok(
        result.sourceCode.includes('{') && result.sourceCode.includes('}'),
        'Should be properly bracketed',
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should extract function definition', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'processData', filePath);

      assert.ok(result, 'Should extract function chunk');

      // Check essential parts
      assert.ok(
        result.sourceCode.includes('export function processData'),
        'Should include function declaration',
      );
      assert.ok(result.sourceCode.includes('input: string'), 'Should include parameter');
      assert.ok(result.sourceCode.includes('string[]'), 'Should include return type');
      assert.ok(result.sourceCode.includes('split'), 'Should include function body');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle non-existent identifier', async (t) => {
    const filePath = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const tree = analyzer.parser.parse(await readFile(filePath, 'utf-8'));
      const result = await analyzer.extractCodeChunk(tree, 'NonExistent', filePath);

      assert.strictEqual(result, null, 'Should return null for non-existent identifier');
    } finally {
      await cleanupTestFiles();
    }
  });
});
