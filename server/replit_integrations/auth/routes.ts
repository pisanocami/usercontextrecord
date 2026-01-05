import type { Express } from "express";

// Development mode check - MUST be first
const isDev = process.env.NODE_ENV === 'development' || !process.env.REPL_ID;
const DEV_USER_ID = 'dev-user-local';

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user - NO middleware, handle auth internally
  app.get("/api/auth/user", (req: any, res) => {
    // ALWAYS return mock user in development - no DB access needed
    if (isDev) {
      return res.json({
        id: DEV_USER_ID,
        email: "dev@localhost",
        firstName: "Dev",
        lastName: "User",
        profileImageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    // In production, require authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Only import and use authStorage in production
    import("./storage").then(({ authStorage }) => {
      authStorage.getUser(req.user.claims.sub)
        .then(user => res.json(user))
        .catch(error => {
          console.error("Error fetching user:", error);
          res.status(500).json({ message: "Failed to fetch user" });
        });
    });
  });
}
