import { randomUUID } from "crypto";
import type {
  Configuration,
  InsertConfiguration,
} from "@shared/schema";

export interface IStorage {
  getConfiguration(): Promise<Configuration | undefined>;
  saveConfiguration(config: InsertConfiguration): Promise<Configuration>;
}

export class MemStorage implements IStorage {
  private configuration: Configuration | undefined;

  constructor() {
    this.configuration = undefined;
  }

  async getConfiguration(): Promise<Configuration | undefined> {
    return this.configuration;
  }

  async saveConfiguration(insertConfig: InsertConfiguration): Promise<Configuration> {
    const now = new Date().toISOString();
    
    if (this.configuration) {
      this.configuration = {
        ...this.configuration,
        ...insertConfig,
        updated_at: now,
      };
    } else {
      this.configuration = {
        id: randomUUID(),
        ...insertConfig,
        created_at: now,
        updated_at: now,
      };
    }
    
    return this.configuration;
  }
}

export const storage = new MemStorage();
