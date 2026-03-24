import { createHash }    from "crypto";
import { Task, Agent, AgentResult } from "../types";
import { analyzeTask }   from "./taskAnalyzer";
import { selectAgents }  from "./agentSelector";
import { mergeOutputs }  from "./outputMerger";
import { runAgent }      from "../agents/agentRunner";
import { getCached, setCache } from "../cache/cacheService";
import { emitToProject } from "../api/socket";

export async function orchestrate(
  task:       Task,
  allAgents:  Agent[],
  projectId?: string
): Promise<AgentResult> {

  console.log("\n[CEO] Task alındı:", task.input.slice(0, 60) + "...");

  // Task başladı eventi
  if (projectId) {
    emitToProject(projectId, "activity", {
      type:    "task:start",
      message: `Yeni görev alındı: ${task.input.slice(0, 50)}...`,
      timestamp: Date.now(),
    });
  }

  // 1. Task analizi
  const analysis = analyzeTask(task.input);
  task.type      = analysis.type;
  console.log(`[CEO] Tip: ${analysis.type} | Model: ${analysis.recommendedModel}`);

  // 2. Cache kontrolü
  const cacheKey = createHash("sha256")
    .update(task.input + analysis.type)
    .digest("hex");

  const cached = await getCached(cacheKey);
  if (cached) {
    console.log("[CEO] Cache hit");
    if (projectId) {
      emitToProject(projectId, "activity", {
        type:    "cache:hit",
        message: "Cache'den döndü — token harcanmadı",
        timestamp: Date.now(),
      });
    }
    return cached;
  }

  // 3. Agent seçimi
  const selected = selectAgents(allAgents, analysis.type);
  if (selected.length === 0) selected.push(...allAgents.slice(0, 1));
  console.log(`[CEO] Seçilen: ${selected.map(a => a.name).join(", ")}`);

  // 4. Paralel çalıştır — projectId'yi agent'lara geç
  const results = await Promise.all(
    selected.map(agent => runAgent(agent, task.input, projectId))
  );

  // 5. Birleştir
  const final = mergeOutputs(results);

  // 6. Cache'e kaydet
  await setCache(cacheKey, final);

  // Task tamamlandı eventi
  const totalTokens = results.reduce((s, r) => s + r.tokenUsed, 0);
  if (projectId) {
    emitToProject(projectId, "activity", {
      type:      "task:done",
      message:   `Görev tamamlandı`,
      tokenUsed: totalTokens,
      timestamp: Date.now(),
    });
  }

  console.log(`[CEO] Tamamlandı — toplam token: ${totalTokens}`);

  return final;
}