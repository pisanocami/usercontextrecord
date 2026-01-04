import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Development mode check
const isDev = process.env.NODE_ENV === 'development' || !process.env.REPL_ID;
const DEV_USER_ID = 'dev-user-local';

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // In development mode, return a mock user
      if (isDev) {
        const devUser = {
          id: DEV_USER_ID,
          email: "dev@localhost",
          firstName: "Dev",
          lastName: "User",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return res.json(devUser);
      }
      
      // In production, require authentication
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
