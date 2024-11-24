import { ExtensionContext } from 'vscode';
import { CompositionRoot } from './composition/CompositionRoot';
import { Logger } from './logger/Logger';

let root: CompositionRoot;

export async function activate(context: ExtensionContext): Promise<void> {
  const logger = new Logger('Mini Language Server');
  
  root = new CompositionRoot({ 
    logger, 
    context 
  });
  
  await root.initialize();
}

export async function deactivate(): Promise<void> {
  if (root) {
    await root.dispose();
  }
}
