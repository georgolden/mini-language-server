import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import * as path from 'path';
import { ASTDependencyAnalyzer } from './ASTDependencyAnalyzer.js';

const TEST_DIR = 'test-files';

async function setupTestFiles() {
  await mkdir(`${TEST_DIR}/src`, { recursive: true });
  await mkdir(`${TEST_DIR}/src/types`, { recursive: true });
  await mkdir(`${TEST_DIR}/src/utils`, { recursive: true });

  const sourceFiles = {
    // Main entry with different import types
    'src/main.ts': `
import { DataService } from './services/DataService';
import type { Config } from './types';
import * as utils from './utils/helpers';
import { validateData as validate } from './utils/validators';

export async function processData(config: Config) {
  const service = new DataService(config);
  await utils.initialize();
  return validate(await service.getData());
}`,

    // Service using multiple features
    'src/services/DataService.ts': `
import { Config, DataHandler } from '../types';
import { Logger } from '../utils/Logger';
import { BaseService } from './BaseService';

export class DataService extends BaseService implements DataHandler {
  private logger: Logger;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
    this.logger = new Logger('data');
  }

  async getData(): Promise<string> {
    this.logger.log('Getting data...');
    return 'data';
  }
}`,

    // Base service with its own dependencies
    'src/services/BaseService.ts': `
import { MetricsCollector } from '../utils/metrics';

export abstract class BaseService {
  protected metrics: MetricsCollector;
  
  constructor() {
    this.metrics = new MetricsCollector();
  }
}`,

    // Types with nested dependencies
    'src/types/index.ts': `
export interface Config {
  timeout: number;
  handler?: DataHandler;
}

export interface DataHandler {
  getData(): Promise<string>;
}

// Re-export
export { MetricsConfig } from './metrics';`,

    // Additional types
    'src/types/metrics.ts': `
export interface MetricsConfig {
  enabled: boolean;
  interval: number;
}`,

    // Utils with multiple exports
    'src/utils/helpers.ts': `
import { Config } from '../types';
import { MetricsCollector } from './metrics';

export async function initialize() {
  const metrics = new MetricsCollector();
  metrics.record('init');
}

export function parseConfig(input: string): Config {
  return JSON.parse(input);
}`,

    // Logger utility
    'src/utils/Logger.ts': `
import { MetricsCollector } from './metrics';

export class Logger {
  private metrics: MetricsCollector;
  
  constructor(private context: string) {
    this.metrics = new MetricsCollector();
  }
  
  log(message: string): void {
    this.metrics.record('log');
    console.log(\`[\${this.context}] \${message}\`);
  }
}`,

    // Metrics collector
    'src/utils/metrics.ts': `
import { MetricsConfig } from '../types/metrics';

export class MetricsCollector {
  private config: MetricsConfig = {
    enabled: true,
    interval: 1000
  };

  record(event: string): void {
    if (this.config.enabled) {
      console.log(\`Metric: \${event}\`);
    }
  }
}`,

    // Validators
    'src/utils/validators.ts': `
import { MetricsCollector } from './metrics';

export function validateData(data: string): boolean {
  const metrics = new MetricsCollector();
  metrics.record('validate');
  return data.length > 0;
}

export function validateConfig(config: string): boolean {
  return config.length > 0;
}`,
  };

  for (const [filePath, content] of Object.entries(sourceFiles)) {
    const fullPath = path.resolve(TEST_DIR, filePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }

  return {
    mainPath: path.resolve(TEST_DIR, 'src/main.ts'),
    files: Object.keys(sourceFiles).reduce(
      (acc, key) => {
        acc[key] = path.resolve(TEST_DIR, key);
        return acc;
      },
      {} as Record<string, string>,
    ),
  };
}

async function cleanupTestFiles() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe('ASTDependencyAnalyzer - Full Pipeline', async () => {
  test('should analyze class with inheritance and implementation', async (t) => {
    const { files } = await setupTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.analyzeIdentifierDependencies(
        'DataService',
        //@ts-ignore
        files['src/services/DataService.ts'],
      );
      assert.ok(result, 'Should find DataService');
      assert.ok(result.dependencies instanceof Map, 'Should have dependencies map');

      // Direct dependencies
      assert.ok(result.dependencies.has('Config'), 'Should include Config interface');
      assert.ok(result.dependencies.has('DataHandler'), 'Should include DataHandler interface');
      assert.ok(result.dependencies.has('Logger'), 'Should include Logger class');
      assert.ok(result.dependencies.has('BaseService'), 'Should include base class');

      // Nested dependencies
      const baseService = result.dependencies.get('BaseService');
      assert.ok(
        baseService?.dependencies.has('MetricsCollector'),
        'BaseService should depend on MetricsCollector',
      );

      const logger = result.dependencies.get('Logger');
      assert.ok(
        logger?.dependencies.has('MetricsCollector'),
        'Logger should depend on MetricsCollector',
      );

      // Re-exported dependencies
      const metricsCollector = baseService?.dependencies.get('MetricsCollector');
      assert.ok(
        metricsCollector?.dependencies.has('MetricsConfig'),
        'MetricsCollector should depend on MetricsConfig',
      );

      // Verify source code chunks
      assert.ok(!result.sourceCode.includes('validateConfig'), 'Should not include unrelated code');
      assert.ok(
        logger?.sourceCode.includes('class Logger'),
        'Should extract Logger class definition',
      );
    } finally {
      await cleanupTestFiles();
    }
  });
});
