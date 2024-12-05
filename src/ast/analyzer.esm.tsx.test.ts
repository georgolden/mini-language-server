import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import * as path from 'path';
import { ASTDependencyAnalyzer } from './ASTDependencyAnalyzer';

const TEST_DIR = 'test-files';

interface TestFiles {
  mainPath: string;
  componentPath: string;
  utilsPath: string;
  typesPath: string;
  hookPath: string;
}

async function setupESMTSXTestFiles(): Promise<TestFiles> {
  await mkdir(`${TEST_DIR}/src/components`, { recursive: true });
  await mkdir(`${TEST_DIR}/src/utils`, { recursive: true });
  await mkdir(`${TEST_DIR}/src/types`, { recursive: true });
  await mkdir(`${TEST_DIR}/src/hooks`, { recursive: true });

  // Main file with .js extensions in imports (ESM style)
  const mainFile = `
import { Button } from './components/Button.js';
import { useCounter } from './hooks/useCounter.js';
import type { ButtonProps } from './types/components.js';
import * as styleUtils from './utils/styles.js';

export function App(): JSX.Element {
  const { count, increment } = useCounter();
  
  return (
    <div className={styleUtils.getContainerClass()}>
      <Button onClick={increment} size="large">
        Count: {count}
      </Button>
    </div>
  );
}`;

  // React component in TSX
  const componentFile = `
import { type FC, type MouseEvent } from 'react';
import { ButtonProps } from '../types/components.js';
import { getButtonStyles } from '../utils/styles.js';

export const Button: FC<ButtonProps> = ({ 
  children, 
  onClick,
  size = 'medium'
}) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
  };

  return (
    <button
      className={getButtonStyles(size)}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};`;

  // Utility functions
  const utilsFile = `
import type { Size } from '../types/components.js';

export function getButtonStyles(size: Size): string {
  return \`btn btn-\${size}\`;
}

export function getContainerClass(): string {
  return 'container';
}`;

  // Types file
  const typesFile = `
import type { MouseEvent } from 'react';

export type Size = 'small' | 'medium' | 'large';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: Size;
}`;

  // Custom hook
  const hookFile = `
import { useState, useCallback } from 'react';

export interface CounterHook {
  count: number;
  increment: () => void;
}

export function useCounter(initial: number = 0): CounterHook {
  const [count, setCount] = useState(initial);
  
  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  return { count, increment };
}`;

  const paths = {
    mainPath: path.resolve(TEST_DIR, 'src/App.tsx'),
    componentPath: path.resolve(TEST_DIR, 'src/components/Button.tsx'),
    utilsPath: path.resolve(TEST_DIR, 'src/utils/styles.ts'),
    typesPath: path.resolve(TEST_DIR, 'src/types/components.ts'),
    hookPath: path.resolve(TEST_DIR, 'src/hooks/useCounter.ts')
  };

  await writeFile(paths.mainPath, mainFile);
  await writeFile(paths.componentPath, componentFile);
  await writeFile(paths.utilsPath, utilsFile);
  await writeFile(paths.typesPath, typesFile);
  await writeFile(paths.hookPath, hookFile);

  return paths;
}

async function cleanupTestFiles() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe('ASTDependencyAnalyzer - ESM and TSX Support', async () => {
  test('should resolve .js extension to .ts/.tsx files', async (t) => {
    const paths = await setupESMTSXTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition(
        'Button',
        paths.mainPath
      );

      assert.ok(result, 'Should find Button component definition');
      assert.ok(result.filePath.endsWith('.tsx'), 'Should resolve to .tsx file');
      assert.strictEqual(result.filePath, paths.componentPath, 'Should find correct file path');

      // Verify content
      const fileContent = await readFile(result.filePath, 'utf-8');
      const definitionSnippet = fileContent.substring(
        result.position.start.offset,
        result.position.end.offset
      );
      assert.ok(
        definitionSnippet.includes('export const Button'),
        'Should find component definition'
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should analyze TSX component dependencies', async (t) => {
    const paths = await setupESMTSXTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.analyzeIdentifierDependencies(
        'Button',
        paths.componentPath
      );

      assert.ok(result, 'Should analyze Button component');
      assert.ok(result.dependencies.has('ButtonProps'), 'Should find ButtonProps dependency');
      assert.ok(result.dependencies.has('getButtonStyles'), 'Should find style utility dependency');
      
      // Verify nested dependencies
      const buttonPropsNode = result.dependencies.get('ButtonProps');
      assert.ok(buttonPropsNode, 'Should resolve ButtonProps node');
      assert.ok(buttonPropsNode.dependencies.has('Size'), 'ButtonProps should depend on Size type');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle React types and hooks', async (t) => {
    const paths = await setupESMTSXTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.analyzeIdentifierDependencies(
        'useCounter',
        paths.hookPath
      );

      assert.ok(result, 'Should analyze hook');
      assert.ok(result.dependencies.has('CounterHook'), 'Should find CounterHook interface');
      
      // Hook source should contain useState and useCallback
      assert.ok(
        result.sourceCode.includes('useState') && 
        result.sourceCode.includes('useCallback'),
        'Should preserve hook implementations'
      );
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle type imports with .js extension', async (t) => {
    const paths = await setupESMTSXTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition(
        'ButtonProps',
        paths.componentPath
      );

      assert.ok(result, 'Should find type definition');
      assert.ok(result.filePath.endsWith('.ts'), 'Should resolve to .ts file');
      assert.strictEqual(result.filePath, paths.typesPath, 'Should find correct types file');
    } finally {
      await cleanupTestFiles();
    }
  });

  test('should handle namespace imports with .js extension', async (t) => {
    const paths = await setupESMTSXTestFiles();
    const analyzer = new ASTDependencyAnalyzer();

    try {
      const result = await analyzer.findIdentifierDefinition(
        'styleUtils',
        paths.mainPath
      );

      assert.ok(result, 'Should find namespace import');
      assert.ok(result.filePath.endsWith('.ts'), 'Should resolve to .ts file');
      assert.strictEqual(result.filePath, paths.utilsPath, 'Should find correct utils file');
    } finally {
      await cleanupTestFiles();
    }
  });
});
