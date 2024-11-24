# VSCode Mini Language Server

A minimalistic VSCode extension implementing a Language Server Protocol (LSP) client with advanced file watching capabilities and command palette integration for TypeScript/JavaScript projects.

## Architecture Overview

The project follows a service-oriented architecture with dependency injection and clear separation of concerns. It's built around these main concepts:

1. **Services**: Independent units with clear lifecycle management
2. **Composition Root**: Central point for dependency injection and service orchestration
3. **Event-Based Communication**: Using EventEmitter for file system changes
4. **Command System**: Extensible command palette integration

### Core Design Principles

- Interface-based design over inheritance
- Clear service lifecycle (initialize/dispose)
- Dependency injection for better testability
- Event-driven architecture for file watching
- Command pattern for user interactions
- Explicit state management
- Strong typing throughout the codebase

## Project Structure

```
src/
├── composition/
│   └── CompositionRoot.ts    # Service orchestration and DI container
├── services/
│   ├── types.ts             # Core service interfaces and types
│   ├── FileWatcherService.ts # File system watching and caching
│   ├── LanguageClientService.ts # LSP client implementation
│   └── CommandService.ts    # Command palette integration
├── commands/
│   ├── types.ts            # Command interfaces and types
│   └── implementations.ts  # Concrete command implementations
├── logger/
│   └── Logger.ts           # Logging infrastructure
└── extension.ts            # VSCode extension entry point
```

### Key Components

#### 1. Service Interface (src/services/types.ts)
Core contract that all services must implement:

```typescript
interface IService {
  readonly state: ServiceState;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
```

#### 2. FileWatcherService
Manages file system operations and maintains an in-memory cache of files:
- Watches for file changes using VSCode's FileSystemWatcher
- Maintains a Map of FileInfo objects
- Emits events for file system changes
- Provides API for file content manipulation

#### 3. LanguageClientService
Handles LSP client implementation:
- Configures and manages the Language Client
- Connects to the language server
- Handles client lifecycle

#### 4. CommandService
Manages VSCode command palette integration:
- Registers commands with VSCode
- Handles command execution
- Manages command lifecycle
- Provides type-safe command registration

Example command registration:
```typescript
interface Command {
  id: string;
  title: string;
  handler: (...args: any[]) => Promise<void>;
}

commandService.registerCommand({
  id: 'myExtension.commandId',
  title: 'My Command',
  handler: async () => {
    // Command implementation
  }
});
```

#### 5. CompositionRoot
Manages service lifecycle and dependencies:
- Initializes all services in correct order
- Handles proper cleanup
- Centralizes error handling
- Orchestrates command registration

## Service Lifecycle

Each service follows a strict lifecycle:

1. **Construction**: Services receive their dependencies
2. **Initialization**: async setup operations
3. **Active State**: service is running
4. **Disposal**: cleanup of resources

Example:
```typescript
const service = new FileWatcherService({ 
  logger, 
  workspacePath 
});
await service.initialize();
// ... use service
await service.dispose();
```

## Event System

The FileWatcherService emits events for file changes:

```typescript
fileWatcherService.on('add', ({ file }) => {
  // Handle new file
});

fileWatcherService.on('change', ({ file }) => {
  // Handle file modifications
});

fileWatcherService.on('unlink', ({ file }) => {
  // Handle file deletion
});
```

## Command System

Commands are defined as separate units:

```typescript
interface Command {
  id: string;
  title: string;
  handler: (...args: any[]) => Promise<void>;
}

// Command implementation
const command: Command = {
  id: 'miniLanguageServer.showFileCount',
  title: 'Show File Count',
  handler: async () => {
    // Implementation
  }
};
```

## Contributing

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run compile
```

4. Launch the extension in debug mode:
   - Press F5 in VSCode
   - A new VSCode window will open with the extension loaded

### Adding New Features

1. **Adding a New Service**
   - Create a new file in `src/services`
   - Implement the `IService` interface
   - Add to CompositionRoot

2. **Adding New Commands**
   - Define command in `commands/implementations.ts`
   - Add command contribution to `package.json`
   - Command will be automatically registered by CommandService

Example new command:
```typescript
export function createCustomCommand(service: SomeService): Command {
  return {
    id: 'miniLanguageServer.customCommand',
    title: 'Custom Command',
    handler: async () => {
      // Implementation
    }
  };
}
```

### Best Practices

1. **State Management**
   - Always check service state before operations
   - Use state assertions
   - Clean up resources properly

2. **Error Handling**
   - Use async/await consistently
   - Provide meaningful error messages
   - Log errors appropriately

3. **Dependency Injection**
   - Define clear interfaces for dependencies
   - Use dependency injection in constructors
   - Avoid service locator pattern

4. **Command Implementation**
   - Keep commands focused and single-purpose
   - Provide clear command titles
   - Handle errors gracefully
   - Log command execution

## License

MIT
