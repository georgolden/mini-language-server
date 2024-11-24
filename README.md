# VSCode Mini Language Server

A minimalistic VSCode extension implementing a Language Server Protocol (LSP) client with advanced file watching capabilities for TypeScript/JavaScript projects.

## Architecture Overview

The project follows a service-oriented architecture with dependency injection and clear separation of concerns. It's built around three main concepts:

1. **Services**: Independent units with clear lifecycle management
2. **Composition Root**: Central point for dependency injection and service orchestration
3. **Event-Based Communication**: Using EventEmitter for file system changes

### Core Design Principles

- Interface-based design over inheritance
- Clear service lifecycle (initialize/dispose)
- Dependency injection for better testability
- Event-driven architecture for file watching
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
│   └── LanguageClientService.ts # LSP client implementation
├── logger/
│   └── Logger.ts            # Logging infrastructure
└── extension.ts             # VSCode extension entry point
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

#### 4. CompositionRoot
Manages service lifecycle and dependencies:
- Initializes all services in correct order
- Handles proper cleanup
- Centralizes error handling

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

## Error Handling

Services use state assertions to prevent invalid operations:

```typescript
private assertState(action: string): void {
  if (this.state.isDisposed) {
    throw new Error(`Cannot ${action}: service is disposed`);
  }
  // ... other assertions
}
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

Example:
```typescript
export class NewService implements IService {
  public readonly state: ServiceState = {
    isInitialized: false,
    isDisposed: false,
  };

  constructor(deps: ServiceDependencies) {
    // ...
  }

  async initialize(): Promise<void> {
    // ...
  }

  async dispose(): Promise<void> {
    // ...
  }
}
```

2. **Modifying Existing Services**
   - Ensure state assertions are maintained
   - Update CompositionRoot if needed
   - Add appropriate logging

### Testing

- Write tests for new services
- Ensure proper cleanup in tests
- Mock dependencies for unit tests

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

## License

MIT
