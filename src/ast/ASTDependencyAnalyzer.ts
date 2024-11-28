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

interface DependencyNode {
  identifier: string;
  sourceCode: string;
  position: SourcePosition;
  filePath: string;
  dependencies: Map<string, DependencyNode>; // Changed from Set to Map of full nodes
}

class ASTDependencyAnalyzer {
  parser: Parser;
  private cache: Map<string, DependencyNode> = new Map();
  private processing: Set<string> = new Set();

  constructor() {
    this.parser = new Parser();
    // Initialize parser with JavaScript/TypeScript grammar
    this.parser.setLanguage(require('tree-sitter-typescript').typescript);
  }

  async analyzeIdentifierDependencies(
    identifier: IdentifierUsage,
    fromFilePath: string,
  ): Promise<DependencyNode | null> {
    const cacheKey = `${fromFilePath}:${identifier.name}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.processing.has(cacheKey)) {
      return null;
    }

    this.processing.add(cacheKey);

    try {
      const location = await this.findIdentifierDefinition(identifier, fromFilePath);
      if (!location) return null;

      const sourceCode = await readFile(location.filePath, 'utf-8');
      const tree = this.parser.parse(sourceCode);

      const chunk = await this.extractCodeChunk(tree, identifier.name, location.filePath);
      if (!chunk) return null;

      // Get direct dependencies
      const directDependencies = this.findChunkDependencies(tree, chunk.position);

      // Recursively resolve each dependency
      const resolvedDependencies = new Map<string, DependencyNode>();

      for (const depName of directDependencies) {
        // Skip if it's the current identifier to avoid cycles
        if (depName === identifier.name) continue;

        const depNode = await this.analyzeIdentifierDependencies(
          {
            name: depName,
            position: chunk.position, // We'll use this as a starting point
          },
          location.filePath,
        );

        if (depNode) {
          resolvedDependencies.set(depName, depNode);
        }
      }

      const result: DependencyNode = {
        identifier: identifier.name,
        sourceCode: chunk.sourceCode,
        position: chunk.position,
        filePath: location.filePath,
        dependencies: resolvedDependencies,
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
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        const basePath = path.resolve(path.dirname(fromFilePath), importPath);

        console.log('Base path:', basePath);

        // First try with exact path if it has extension
        if (path.extname(importPath)) {
          if (await this.fileExists(basePath)) {
            return basePath;
          }
        }

        // Try adding extensions directly
        for (const ext of extensions) {
          const fullPath = basePath + ext;
          console.log('Trying path:', fullPath);

          if (await this.fileExists(fullPath)) {
            console.log('Found existing file:', fullPath);
            return fullPath;
          }
        }

        // Try index files in directory
        for (const ext of extensions) {
          const indexPath = path.join(basePath, `index${ext}`);
          console.log('Trying index path:', indexPath);

          if (await this.fileExists(indexPath)) {
            console.log('Found existing index file:', indexPath);
            return indexPath;
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
    console.log('\nFinding definition for:', identifierName);
    console.log('Tree root type:', tree.rootNode.type);
    let result = null;

    const visitNode = (node: Parser.SyntaxNode): void => {
      console.log('Visiting node:', node.type);

      if (
        node.type === 'export_statement' ||
        node.type === 'export_named_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'type_alias_declaration' // Add type alias handling
      ) {
        console.log('Found export or type declaration:', node.text);
        let identifierNode: Parser.SyntaxNode | null = null;

        if (node.type === 'type_alias_declaration') {
          console.log('Processing type alias');
          identifierNode = node.childForFieldName('name');
          console.log('Type alias name:', identifierNode?.text);
        } else if (node.type === 'interface_declaration') {
          identifierNode = node.childForFieldName('name');
          console.log('Interface name:', identifierNode?.text);
        } else if (node.type === 'export_statement') {
          const declaration = node.childForFieldName('declaration');
          console.log('Export declaration type:', declaration?.type);

          if (declaration) {
            if (declaration.type === 'type_alias_declaration') {
              identifierNode = declaration.childForFieldName('name');
              console.log('Exported type name:', identifierNode?.text);
            } else if (declaration.type === 'interface_declaration') {
              identifierNode = declaration.childForFieldName('name');
            } else if (
              declaration.type === 'function_declaration' ||
              declaration.type === 'class_declaration'
            ) {
              identifierNode = declaration.childForFieldName('name');
            } else if (declaration.type === 'variable_declaration') {
              const declarators = declaration.descendantsOfType('variable_declarator');
              const firstDeclarator = declarators[0];
              if (firstDeclarator) {
                identifierNode = firstDeclarator.childForFieldName('name');
              }
            }
          }
        } else {
          // export_named_declaration
          const identifiers = node.descendantsOfType('identifier');
          const firstIdentifier = identifiers[0];
          if (firstIdentifier) {
            identifierNode = firstIdentifier;
          }
        }

        if (identifierNode && identifierNode.text === identifierName) {
          console.log('Found matching identifier:', identifierNode.text);
          const targetNode = node.type === 'export_statement' ? node : identifierNode.parent;
          if (targetNode) {
            result = {
              start: {
                line: targetNode.startPosition.row,
                column: targetNode.startPosition.column,
                offset: targetNode.startIndex,
              },
              end: {
                line: targetNode.endPosition.row,
                column: targetNode.endPosition.column,
                offset: targetNode.endIndex,
              },
            };
            return;
          }
        }
      }

      for (const child of node.children) {
        visitNode(child);
      }
    };

    visitNode(tree.rootNode);
    console.log('Definition search result:', result);
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

  async extractCodeChunk(
    tree: Parser.Tree,
    identifier: string,
    filePath: string,
  ): Promise<{ sourceCode: string; position: SourcePosition } | null> {
    console.log('\nExtracting code chunk for:', identifier);
    console.log('From file:', filePath);

    const findIdentifierNode = (node: Parser.SyntaxNode): Parser.SyntaxNode | null => {
      console.log('Visiting node:', node.type);

      if (
        node.type === 'class_declaration' ||
        node.type === 'function_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'type_alias_declaration' ||
        node.type === 'enum_declaration'
      ) {
        const nameNode = node.childForFieldName('name');
        console.log('Found declaration, checking name:', nameNode?.text);
        if (nameNode?.text === identifier) {
          console.log('Found matching declaration:', node.type);
          // If this node is part of an export statement, return the export statement
          return node.parent?.type === 'export_statement' ? node.parent : node;
        }
      } else if (node.type === 'lexical_declaration') {
        console.log('Checking lexical declaration');
        const declarators = node.descendantsOfType('variable_declarator');
        for (const declarator of declarators) {
          const nameNode = declarator.childForFieldName('name');
          if (nameNode?.text === identifier) {
            console.log('Found matching variable declarator:', nameNode.text);
            return node.parent?.type === 'export_statement' ? node.parent : node;
          }
        }
      }

      for (const child of node.children) {
        const result = findIdentifierNode(child);
        if (result) return result;
      }

      return null;
    };

    const declarationNode = findIdentifierNode(tree.rootNode);
    if (!declarationNode) {
      console.log('No declaration found for:', identifier);
      return null;
    }

    console.log('Found declaration node:', {
      type: declarationNode.type,
      startIndex: declarationNode.startIndex,
      endIndex: declarationNode.endIndex,
      text: declarationNode.text.slice(0, 50), // Truncate long text in logs
    });

    const fileContent = await readFile(filePath, 'utf-8');
    const chunk = fileContent.substring(declarationNode.startIndex, declarationNode.endIndex);

    return {
      sourceCode: chunk,
      position: {
        start: {
          line: declarationNode.startPosition.row,
          column: declarationNode.startPosition.column,
          offset: declarationNode.startIndex,
        },
        end: {
          line: declarationNode.endPosition.row,
          column: declarationNode.endPosition.column,
          offset: declarationNode.endIndex,
        },
      },
    };
  }

  findChunkDependencies(tree: Parser.Tree, position: SourcePosition): Set<string> {
    console.log('\nFinding chunk dependencies in range:', position);
    const dependencies = new Set<string>();
    const builtInTypes = new Set([
      'string',
      'number',
      'boolean',
      'void',
      'null',
      'undefined',
      'object',
      'symbol',
      'bigint',
      'any',
      'unknown',
      'never',
      'Promise',
      'Array',
      'Map',
      'Set',
    ]);

    let mainDeclarationName: string | null = null;
    const typeParameters = new Set<string>(); // Track all type parameters

    const isInRange = (node: Parser.SyntaxNode): boolean => {
      const hasOverlap = !(
        node.endIndex < position.start.offset || node.startIndex > position.end.offset
      );
      return hasOverlap;
    };

    // First pass: collect type parameters
    const collectTypeParams = (node: Parser.SyntaxNode): void => {
      if (node.type === 'type_parameters') {
        for (const param of node.children) {
          if (param.type === 'type_parameter') {
            const paramName = param.childForFieldName('name');
            if (paramName) {
              typeParameters.add(paramName.text);
            }
          }
        }
      }
      node.children.forEach(collectTypeParams);
    };

    const processNode = (node: Parser.SyntaxNode): void => {
      if (
        node.type === 'class_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'type_alias_declaration' ||
        node.type === 'enum_declaration'
      ) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          mainDeclarationName = nameNode.text;
        }
      }

      if (!isInRange(node)) {
        return;
      }

      if (node.type === 'type_identifier') {
        const identifierName = node.text;
        if (
          !builtInTypes.has(identifierName) &&
          identifierName !== mainDeclarationName &&
          !typeParameters.has(identifierName)
        ) {
          // Check against type parameters
          dependencies.add(identifierName);
        }
      } else if (node.type === 'identifier') {
        const identifierName = node.text;

        if (
          node.parent?.type === 'class_declaration' ||
          node.parent?.type === 'method_definition' ||
          node.parent?.type === 'property_identifier' ||
          node.parent?.type === 'required_parameter' ||
          node.parent?.type === 'type_parameter' ||
          identifierName === mainDeclarationName ||
          typeParameters.has(identifierName) || // Check against type parameters
          [
            'this',
            'constructor',
            'class',
            'interface',
            'type',
            'export',
            'import',
            'return',
            'async',
            'await',
          ].includes(identifierName) ||
          builtInTypes.has(identifierName)
        ) {
          return;
        }

        dependencies.add(identifierName);
      }

      for (const child of node.children) {
        processNode(child);
      }
    };

    const exportStatement = tree.rootNode.descendantForPosition({
      row: position.start.line,
      column: position.start.column,
    })?.parent;

    if (exportStatement) {
      // First collect type parameters
      collectTypeParams(exportStatement);
      // Then process for dependencies
      processNode(exportStatement);
    }

    console.log({ dependencies: dependencies });

    return dependencies;
  }
}

export { ASTDependencyAnalyzer, IdentifierUsage, DependencyNode, SourcePosition };
