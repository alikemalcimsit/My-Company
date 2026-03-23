import dotenv from "dotenv";
dotenv.config();

import { prisma }   from "./db/prisma";
import { runAgent } from "./agents/agentRunner";
import { Agent }    from "./types";

async function main() {
  console.log("AI Company backend başladı\n");

  // DB'den agent'ları çek
  const dbAgents = await prisma.agent.findMany({
    where: { projectId: "proj-001" },
  });

  console.log(`${dbAgents.length} agent bulundu\n`);

  // İlk agent'ı test et
  const firstAgent: Agent = {
    id:         dbAgents[0].id,
    name:       dbAgents[0].name,
    role:       dbAgents[0].role,
    model:      "gpt-3.5-turbo", // ucuz modelle test
    goal:       dbAgents[0].goal,
    efficiency: dbAgents[0].efficiency,
  };

  const result = await runAgent(
    firstAgent,
    "Kullanıcı kaydı için basit bir REST endpoint nasıl yazılır?"
  );

  console.log("\n── Sonuç ───────────────────────");
  console.log("Agent  :", result.agentId);
  console.log("Model  :", result.model);
  console.log("Token  :", result.tokenUsed);
  console.log("Süre   :", result.durationMs + "ms");
  console.log("Cevap  :\n", result.output);
  console.log("────────────────────────────────");

  await prisma.$disconnect();
}

main().catch(console.error);