import dotenv from "dotenv";
dotenv.config();

import { prisma }        from "./db/prisma";
import { orchestrate }   from "./orchestrator/orchestrator";
import { disconnectRedis } from "./cache/cacheService";
import { Agent }         from "./types";

async function main() {
  console.log("AI Company backend başladı");

  // DB'den agentları çek
  const dbAgents = await prisma.agent.findMany({
    where: { projectId: "proj-001" },
  });

  const agents: Agent[] = dbAgents.map(a => ({
    id:         a.id,
    name:       a.name,
    role:       a.role,
    model:      "gemini-pro",
    goal:       a.goal,
    efficiency: a.efficiency,
  }));

  // Test 1: Coding task
  const result1 = await orchestrate(
    { id: "task-001", projectId: "proj-001", input: "Kullanıcı kaydı için backend API endpoint yaz", status: "pending" },
    agents
  );

  console.log("\n── Sonuç 1 ─────────────────────");
  console.log("Model :", result1.model);
  console.log("Token :", result1.tokenUsed);
  console.log("Cevap :", result1.output.slice(0, 100) + "...");

  // Test 2: Aynı task tekrar — cache devreye girmeli
  console.log("\n── Test 2: Cache ───────────────");
  const result2 = await orchestrate(
    { id: "task-002", projectId: "proj-001", input: "Kullanıcı kaydı için backend API endpoint yaz", status: "pending" },
    agents
  );
  console.log("Cache'den geldi mi:", result2.tokenUsed === result1.tokenUsed ? "✓ Evet" : "✗ Hayır");

  await prisma.$disconnect();
  await disconnectRedis();
}

main().catch(console.error);