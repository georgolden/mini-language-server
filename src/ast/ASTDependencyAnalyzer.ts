import Parser from 'tree-sitter';
import { readFile } from 'fs/promises';
import * as path from 'path';

interface SourcePosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

interface IdentifierUsage {
  name: string;
  position: SourcePosition;
  context?: string[];
}

interface CodeChunk {
  identifier: string;
  sourceCode: string;
  position: SourcePosition;
  filePath: string;
  dependsOn: Set<string>;
}

class ASTDependencyAnalyzer {
  private parser: Parser;
  private cache: Map<string, CodeChunk> = new Map();
  private processing: Set<string> = new Set();

  constructor() {
    this.parser = new Parser();
    // Initialize parser with JavaScript/TypeScript grammar
    this.parser.setLanguage(require('tree-sitter-typescript').typescript);
  }

  async analyzeIdentifierDependencies(
    identifier: IdentifierUsage,
    fromFilePath: string,
  ): Promise<CodeChunk | null> {
    const cacheKey = `${fromFilePath}:${identifier.name}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Prevent circular dependencies
    if (this.processing.has(cacheKey)) {
      return null;
    }

    this.processing.add(cacheKey);

    try {
      // First find where this identifier is defined
      const location = await this.findIdentifierDefinition(identifier, fromFilePath);
      if (!location) return null;

      // Load and parse the file containing the definition
      const sourceCode = await readFile(location.filePath, 'utf-8');
      const tree = this.parser.parse(sourceCode);

      // Extract the minimal code chunk that defines this identifier
      const chunk = await this.extractCodeChunk(tree, identifier.name, location.filePath);
      if (!chunk) return null;

      // Find all identifiers this chunk depends on
      const dependencies = this.findChunkDependencies(tree, chunk.position);

      // Recursively analyze dependencies
      const result: CodeChunk = {
        identifier: identifier.name,
        sourceCode: chunk.sourceCode,
        position: chunk.position,
        filePath: location.filePath,
        dependsOn: dependencies,
      };

      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.processing.delete(cacheKey);
    }
  }

  async findIdentifierDefinition(
    identifier: IdentifierUsage,
    fromFilePath: string,
  ): Promise<{ filePath: string; position: SourcePosition } | null> {
    console.log('\nStarting findIdentifierDefinition:');
    console.log('Looking for identifier:', identifier.name);
    console.log('In file:', fromFilePath);

    try {
      // Read and parse the source file
      const sourceCode = await readFile(fromFilePath, 'utf-8');
      console.log('Successfully read source file');

      const tree = this.parser.parse(sourceCode);
      console.log('Successfully parsed source file');

      // Find relevant import statement for this identifier
      const imports = this.findImportForIdentifier(tree, identifier.name);
      console.log('Import search result:', imports);

      if (!imports) {
        console.log('No import statement found for', identifier.name);
        return null;
      }

      // Resolve the import path
      const resolvedPath = await this.resolveImportPath(imports.source, fromFilePath);
      console.log('Resolved import path:', resolvedPath);

      if (!resolvedPath) {
        console.log('Could not resolve import path for', imports.source);
        return null;
      }

      // Parse the imported file
      const importedCode = await readFile(resolvedPath, 'utf-8');
      console.log('Successfully read imported file');

      const importedTree = this.parser.parse(importedCode);
      console.log('Successfully parsed imported file');

      // Find the actual definition
      const position = this.findDefinitionInFile(importedTree, identifier.name);
      console.log('Definition position result:', position);

      if (!position) {
        console.log('Could not find definition in file');
        return null;
      }

      return {
        filePath: resolvedPath,
        position,
      };
    } catch (error) {
      console.error('Error in findIdentifierDefinition:', error);
      return null;
    }
  }

  private findImportForIdentifier(
    tree: Parser.Tree,
    identifierName: string,
  ): { source: string } | null {
    console.log('\nStarting findImportForIdentifier for:', identifierName);
    let result: { source: string } | null = null;

    const visitNode = (node: Parser.SyntaxNode): void => {
      if (node.type === 'import_statement') {
        console.log('\nAnalyzing import statement:', node.text);

        console.log(
          'Node children types:',
          node.children.map((c) => c.type),
        );

        const namedImports = node.descendantsOfType('import_specifier');
        console.log('Found import specifiers:', namedImports.length);

        for (const importSpec of namedImports) {
          console.log('\nAnalyzing import specifier:', importSpec.text);

          const identifiers = importSpec.descendantsOfType('identifier');
          console.log(
            'Identifiers in specifier:',
            identifiers.map((id) => id.text),
          );

          if (identifiers.some((id) => id.text === identifierName)) {
            console.log('Found matching identifier:', identifierName);

            const sources = node.descendantsOfType('string');
            const firstSource = sources[0];
            if (firstSource) {
              const sourceText = firstSource.text;
              console.log('Found source:', sourceText);
              result = {
                source: sourceText.slice(1, -1),
              };
              return;
            }
          }
        }
      }

      if (!result) {
        for (const child of node.children) {
          visitNode(child);
        }
      }
    };

    visitNode(tree.rootNode);
    console.log('findImportForIdentifier final result:', result);
    return result;
  }

  private async resolveImportPath(
    importPath: string,
    fromFilePath: string,
  ): Promise<string | null> {
    console.log('\nResolving import path:', importPath, 'from:', fromFilePath);

    try {
      if (importPath.startsWith('.')) {
        // Try different extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        const basePath = path.resolve(path.dirname(fromFilePath), importPath);

        console.log('Base path:', basePath);

        // First, try with the exact path if it has an extension
        if (path.extname(importPath)) {
          if (await this.fileExists(basePath)) {
            return basePath;
          }
        }

        // Try adding extensions
        for (const ext of extensions) {
          const fullPath = basePath + ext;
          console.log('Trying path:', fullPath);

          if (await this.fileExists(fullPath)) {
            console.log('Found existing file:', fullPath);
            return fullPath;
          }
        }

        console.log('No valid file found with any extension');
        return null;
      } else {
        // node_modules import
        return await this.findInNodeModules(importPath, fromFilePath);
      }
    } catch (error) {
      console.error('Error in resolveImportPath:', error);
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await import('fs').then((fs) => fs.promises.access(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private findDefinitionInFile(tree: Parser.Tree, identifierName: string): SourcePosition | null {
    let result = null;
    const cursor = tree.walk();

    const visitNode = (node: Parser.SyntaxNode): void => {
      if (node.type === 'export_statement' || node.type === 'export_named_declaration') {
        // Handle different types of exports
        let identifierNode: Parser.SyntaxNode | null = null;

        if (node.type === 'export_statement') {
          const declaration = node.childForFieldName('declaration');
          if (declaration) {
            // Check for function_declaration, class_declaration, variable_declaration
            if (
              declaration.type === 'function_declaration' ||
              declaration.type === 'class_declaration'
            ) {
              const nameNode = declaration.childForFieldName('name');
              identifierNode = nameNode ?? null;
            } else if (declaration.type === 'variable_declaration') {
              const declarators = declaration.descendantsOfType('variable_declarator');
              const firstDeclarator = declarators[0];
              if (firstDeclarator) {
                // Check if element exists
                const nameNode = firstDeclarator.childForFieldName('name');
                identifierNode = nameNode ?? null;
              }
            }
          }
        } else {
          // export_named_declaration
          const identifiers = node.descendantsOfType('identifier');
          const firstIdentifier = identifiers[0];
          if (firstIdentifier) {
            // Check if element exists
            identifierNode = firstIdentifier;
          }
        }

        if (identifierNode && identifierNode.text === identifierName) {
          result = {
            start: {
              line: node.startPosition.row,
              column: node.startPosition.column,
              offset: node.startIndex,
            },
            end: {
              line: node.endPosition.row,
              column: node.endPosition.column,
              offset: node.endIndex,
            },
          };
          return;
        }
      }

      // Continue traversing
      for (const child of node.children) {
        visitNode(child);
      }
    };

    visitNode(tree.rootNode);
    return result;
  }

  private async findInNodeModules(
    importPath: string,
    fromFilePath: string,
  ): Promise<string | null> {
    // Start from the directory containing fromFilePath
    let currentDir = path.dirname(fromFilePath);

    while (currentDir !== path.parse(currentDir).root) {
      const nodeModulesPath = path.join(currentDir, 'node_modules', importPath);

      try {
        const stats = await import('fs').then((fs) => fs.promises.stat(nodeModulesPath));
        if (stats.isFile()) {
          return nodeModulesPath;
        }

        // Check for package.json main field
        const packageJsonPath = path.join(path.dirname(nodeModulesPath), 'package.json');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

        if (packageJson.main) {
          const mainPath = path.join(path.dirname(nodeModulesPath), packageJson.main);
          return mainPath;
        }
      } catch {
        // Move up to parent directory
        currentDir = path.dirname(currentDir);
        continue;
      }
    }

    return null;
  }

  private async extractCodeChunk(
    tree: Parser.Tree,
    identifier: string,
    filePath: string,
  ): Promise<{ sourceCode: string; position: SourcePosition } | null> {
    // TODO: Implement minimal code chunk extraction
    return null;
  }

  private findChunkDependencies(tree: Parser.Tree, position: SourcePosition): Set<string> {
    // TODO: Implement dependency finding
    return new Set();
  }
}

export { ASTDependencyAnalyzer, IdentifierUsage, CodeChunk, SourcePosition };
