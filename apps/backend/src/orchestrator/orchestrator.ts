import { createHash }    from "crypto";
import { Task, Agent, AgentResult } from "../types";
import { analyzeTask }   from "./taskAnalyzer";
import { selectAgents }  from "./agentSelector";
import { mergeOutputs }  from "./outputMerger";
import { runAgent }      from "../agents/agentRunner";
import { getCached, setCache } from "../cache/cacheService";

export async function orchestrate(
  task: Task,
  allAgents: Agent[]
): Promise<AgentResult> {

  console.log("\n[CEO] Task alındı:", task.input.slice(0, 60) + "...");

  // 1. Task analizi
  const analysis  = analyzeTask(task.input);
  task.type       = analysis.type;
  console.log(`[CEO] Tip: ${analysis.type} | Model: ${analysis.recommendedModel} | Karmaşıklık: ${analysis.complexity}`);

  // 2. Cache kontrolü
  const cacheKey  = createHash("sha256")
    .update(task.input + analysis.type)
    .digest("hex");

  const cached = await getCached(cacheKey);
  if (cached) {
    console.log("[CEO] Cache hit — LLM çağrısı atlandı");
    return cached;
  }

  // 3. Agent seçimi
  const selected  = selectAgents(allAgents, analysis.type);
  if (selected.length === 0) {
    console.log("[CEO] Uygun agent bulunamadı, tüm agentlar deneniyor");
    selected.push(...allAgents.slice(0, 1));
  }
  console.log(`[CEO] Seçilen agentlar: ${selected.map(a => a.name).join(", ")}`);

  // 4. Paralel çalıştır
  const results   = await Promise.all(
    selected.map(agent => runAgent(agent, task.input))
  );

  // 5. Sonuçları birleştir
  const final     = mergeOutputs(results);

  // 6. Cache'e kaydet
  await setCache(cacheKey, final);

  console.log(`[CEO] Tamamlandı — toplam token: ${results.reduce((s, r) => s + r.tokenUsed, 0)}`);

  return final;
}