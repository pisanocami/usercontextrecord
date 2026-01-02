import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, defaultConfiguration } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get current configuration
  app.get("/api/configuration", async (req, res) => {
    try {
      let config = await storage.getConfiguration();
      
      // If no configuration exists, create a default one
      if (!config) {
        config = await storage.saveConfiguration(defaultConfiguration);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Save configuration
  app.post("/api/configuration", async (req, res) => {
    try {
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const config = await storage.saveConfiguration(result.data);
      res.json(config);
    } catch (error) {
      console.error("Error saving configuration:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  return httpServer;
}
