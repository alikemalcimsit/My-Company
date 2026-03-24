import express      from "express";
import cors         from "cors";
import { projectRoutes } from "./routes/projects";
import { agentRoutes }   from "./routes/agents";
import { taskRoutes }    from "./routes/tasks";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Routes
  app.use("/api/projects", projectRoutes);
  app.use("/api/agents",   agentRoutes);
  app.use("/api/tasks",    taskRoutes);

  return app;
}