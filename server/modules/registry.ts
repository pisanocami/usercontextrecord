import type { ModuleExecutor, ModuleDefinition } from './types';

class ModuleRegistry {
  private executors: Map<string, ModuleExecutor> = new Map();

  register(executor: ModuleExecutor): void {
    this.executors.set(executor.definition.id, executor);
  }

  get(moduleId: string): ModuleExecutor | undefined {
    return this.executors.get(moduleId);
  }

  getAll(): ModuleExecutor[] {
    return Array.from(this.executors.values());
  }

  getDefinitions(): ModuleDefinition[] {
    return this.getAll().map(e => e.definition);
  }

  getByCategory(category: string): ModuleExecutor[] {
    return this.getAll().filter(e => e.definition.category === category);
  }

  getByCouncil(councilId: string): ModuleExecutor[] {
    return this.getAll().filter(e => 
      e.definition.ownerCouncil === councilId || 
      e.definition.supportingCouncils.includes(councilId)
    );
  }

  has(moduleId: string): boolean {
    return this.executors.has(moduleId);
  }

  listModuleIds(): string[] {
    return Array.from(this.executors.keys());
  }
}

export const moduleRegistry = new ModuleRegistry();
