interface Tool {
  execute: (...args: any[]) => Promise<any>;
}

type ToolMap = Record<string, Tool>;
type ExcludeExisting<T, K extends string> = K extends keyof T ? never : K;

class Registry<T extends ToolMap = {}> {
  private static instance: Registry | null = null;
  private constructor(private tools: T = {} as T) {}

  static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }

  registerTool<K extends string, V extends Tool>(
    name: ExcludeExisting<T, K>,
    tool: V,
  ): Registry<T & Record<K, V>> {
    const newTools = {
      ...this.tools,
      [name]: tool,
    } as T & Record<K, V>;

    Registry.instance = new Registry(newTools);
    return Registry.instance as Registry<T & Record<K, V>>;
  }

  getTools<K extends keyof T>(...names: K[]): Pick<T, K>;
  getTools(): T;
  getTools<K extends keyof T>(...names: K[]) {
    if (names.length === 0) return this.tools;
    if (new Set(names).size !== names.length) {
      throw new Error('Duplicate tool names are not allowed!');
    }
    return Object.fromEntries(
      names.map((name) => [name, this.tools[name]]),
    ) as Pick<T, K>;
  }
}

// Usage example
const registry = Registry.getInstance()
  .registerTool('calc', {
    execute: async (a: number, b: number) => a + b,
  })
  .registerTool('calc3', {
    execute: async (a: number, b: number) => a + b,
  });

registry.getTools('calc');
