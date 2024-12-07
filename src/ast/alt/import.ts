import assert from "node:assert";
import test, { describe } from "node:test";
import Parser from "tree-sitter";

type ImportKind = 'namespaceImport' | 'typeImport' | 'regularImport';
type SourceKind = 'nodeModule' | 'file';

interface ImportIdentifier {
  identifier: string;
  renamed?: string;
  importKind: ImportKind;
  source: {
    path: string;
    kind: SourceKind;
  }
}

function getImportIdentifiers(sourceCode: string): ImportIdentifier[] {
  const parser = new Parser();
  parser.setLanguage(require('tree-sitter-typescript').typescript);
  
  const tree = parser.parse(sourceCode);
  const importNodes = tree.rootNode.descendantsOfType('import_statement');
  const identifiers: ImportIdentifier[] = [];
  
  for (const node of importNodes) {
    const sourcePath = node.descendantsOfType('string')[0].text.slice(1, -1);
    const sourceKind = sourcePath.startsWith('.') ? 'file' : 'nodeModule';
    const source = { path: sourcePath, kind: sourceKind };

    // Handle namespace imports first - they have highest precedence
    const namespaceImports = node.descendantsOfType('namespace_import');
    if (namespaceImports.length > 0) {
      const namespaceId = namespaceImports[0].descendantsOfType('identifier')[0];
      identifiers.push({
        identifier: namespaceId.text,
        importKind: 'namespaceImport',
        source
      });
      continue; // Skip other processing for namespace imports
    }

    // Default imports - only if not a namespace import
    const importClause = node.descendantsOfType('import_clause');
    if (importClause.length > 0) {
      const clause = importClause[0];
      // Check explicitly that this is a default import (no * or {)
      if (!clause.text.includes('*') && !clause.text.startsWith('{')) {
        const defaultIdentifier = clause.descendantsOfType('identifier')[0];
        if (defaultIdentifier) {
          identifiers.push({
            identifier: defaultIdentifier.text,
            importKind: 'regularImport',
            source
          });
        }
      }
    }

    // Named imports
    const namedImports = node.descendantsOfType('import_specifier');
    for (const specifier of namedImports) {
      const isType = specifier.text.startsWith('type ');
      const ids = specifier.descendantsOfType('identifier');
      
      identifiers.push({
        identifier: ids[0].text,
        ...(ids.length === 2 ? { renamed: ids[1].text } : {}),
        importKind: isType ? 'typeImport' : 'regularImport',
        source
      });
    }
  }
  
  return identifiers;
}

describe('getImportIdentifiers', () => {
  test('handles renamed imports with original as main identifier', () => {
    const code = `
      import { original as renamed, type Type as RenamedType } from './module';
      import { useState as state } from 'react';
    `;
    
    const result = getImportIdentifiers(code);

    assert.deepEqual(result, [
      {
        identifier: 'original',
        renamed: 'renamed',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'Type',
        renamed: 'RenamedType',
        importKind: 'typeImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'useState',
        renamed: 'state',
        importKind: 'regularImport',
        source: { path: 'react', kind: 'nodeModule' }
      }
    ]);
  });

  test('regular named import', () => {
    const code = `import { something } from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'something',
      importKind: 'regularImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('multiple named imports', () => {
    const code = `import { one, two, three } from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [
      {
        identifier: 'one',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'two',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'three',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      }
    ]);
  });

  test('type import', () => {
    const code = `import { type Something } from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'Something',
      importKind: 'typeImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('renamed import', () => {
    const code = `import { original as renamed } from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'original',
      renamed: 'renamed',
      importKind: 'regularImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('renamed type import', () => {
    const code = `import { type Original as Renamed } from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'Original',
      renamed: 'Renamed',
      importKind: 'typeImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('namespace import', () => {
    const code = `import * as utils from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'utils',
      importKind: 'namespaceImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('default import', () => {
    const code = `import Default from './module';`;
    
    assert.deepEqual(getImportIdentifiers(code), [{
      identifier: 'Default',
      importKind: 'regularImport',
      source: { path: './module', kind: 'file' }
    }]);
  });

  test('mixed imports', () => {
    const code = `
      import Default, { 
        one, 
        two as alias, 
        type Three,
        type Four as AliasedFour 
      } from './module';
    `;
    
    assert.deepEqual(getImportIdentifiers(code), [
      {
        identifier: 'Default',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'one',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'two',
        renamed: 'alias',
        importKind: 'regularImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'Three',
        importKind: 'typeImport',
        source: { path: './module', kind: 'file' }
      },
      {
        identifier: 'Four',
        renamed: 'AliasedFour',
        importKind: 'typeImport',
        source: { path: './module', kind: 'file' }
      }
    ]);
  });

  test('node module imports', () => {
    const code = `
      import { useState as state, useEffect } from 'react';
      import axios from 'axios';
    `;
    
    assert.deepEqual(getImportIdentifiers(code), [
      {
        identifier: 'useState',
        renamed: 'state',
        importKind: 'regularImport',
        source: { path: 'react', kind: 'nodeModule' }
      },
      {
        identifier: 'useEffect',
        importKind: 'regularImport',
        source: { path: 'react', kind: 'nodeModule' }
      },
      {
        identifier: 'axios',
        importKind: 'regularImport',
        source: { path: 'axios', kind: 'nodeModule' }
      }
    ]);
  });

  test('multiple import statements', () => {
    const code = `
      import { one } from './module1';
      import { type Two } from './module2';
      import * as three from './module3';
      import { four as alias } from './module4';
    `;
    
    assert.deepEqual(getImportIdentifiers(code), [
      {
        identifier: 'one',
        importKind: 'regularImport',
        source: { path: './module1', kind: 'file' }
      },
      {
        identifier: 'Two',
        importKind: 'typeImport',
        source: { path: './module2', kind: 'file' }
      },
      {
        identifier: 'three',
        importKind: 'namespaceImport',
        source: { path: './module3', kind: 'file' }
      },
      {
        identifier: 'four',
        renamed: 'alias',
        importKind: 'regularImport',
        source: { path: './module4', kind: 'file' }
      }
    ]);
  });
});
