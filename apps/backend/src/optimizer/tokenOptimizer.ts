import { Task, AgentResult, ModelName } from "../types";
import { preFilter }                     from "./preFilter";
import { checkDuplicate, registerTask, resolveTask } from "./deduplicator";
import { minimizeContext }               from "./contextMinimizer";
import { routeModel }                    from "./modelRouter";
import { compressPrompt, estimateTokens } from "./promptCompressor";
import { getCached, setCache }           from "../cache/cacheService";
import { createHash }                    from "crypto";

export interface OptimizerInput {
  task:         Task;
  history:      string[];
  forcedModel?: ModelName;
}

export interface OptimizerOutput {
  text:      string;
  model:     ModelName;
  tokenUsed: number;
  savedBy:   string[]; // hangi katman token kurtardı
}

// LLM çağrısını dışarıdan alıyoruz — optimizer modelden bağımsız
type LLMCaller = (
  model: ModelName,
  system: string,
  user: string
) => Promise<{ text: string; tokenUsed: number }>;

export async function runOptimizedLLM(
  input:     OptimizerInput,
  callLLM:   LLMCaller
): Promise<OptimizerOutput> {
  const savedBy: string[] = [];

  // ── Katman 1: Pre-filter ─────────────────────────────
  const preResult = preFilter(input.task.input);
  if (preResult) {
    savedBy.push("pre-filter");
    console.log("[Optimizer] Pre-filter devreye girdi — LLM atlandı");
    return {
      text:      preResult,
      model:     "gpt-3.5-turbo",
      tokenUsed: 0,
      savedBy,
    };
  }

  // ── Katman 2: Cache kontrolü ─────────────────────────
  const cacheKey = createHash("sha256")
    .update(input.task.input + (input.task.type ?? "simple"))
    .digest("hex");

  const cached = await getCached(cacheKey);
  if (cached) {
    savedBy.push("cache");
    console.log("[Optimizer] Cache hit — LLM atlandı");
    return {
      text:      cached.output,
      model:     cached.model,
      tokenUsed: 0,
      savedBy,
    };
  }

  // ── Katman 3: Deduplication ──────────────────────────
  const dupResult = await checkDuplicate(input.task);
  if (dupResult) {
    savedBy.push("deduplication");
    console.log("[Optimizer] Dedup — sonuç paylaşıldı");
    return { ...dupResult, savedBy };
  }
  registerTask(input.task);

  // ── Katman 4: Context minimization ──────────────────
  const { trimmedHistory, savedTokens } = minimizeContext(input.history);
  if (savedTokens > 0) {
    savedBy.push(`context-minimize(${savedTokens} token kurtarıldı)`);
    console.log(`[Optimizer] Context küçültüldü — ${savedTokens} token kurtarıldı`);
  }

  // ── Katman 5: Model routing ──────────────────────────
  const model = input.forcedModel ?? routeModel(input.task);
  savedBy.push(`model-route(${model})`);
  console.log(`[Optimizer] Model seçildi: ${model}`);

  // ── Katman 6: Prompt compression ────────────────────
  const originalLen     = input.task.input.length;
  const compressedInput = compressPrompt(input.task.input);
  if (compressedInput.length < originalLen) {
    const saved = estimateTokens(input.task.input) - estimateTokens(compressedInput);
    savedBy.push(`prompt-compress(${saved} token kurtarıldı)`);
    console.log(`[Optimizer] Prompt sıkıştırıldı — ${saved} token kurtarıldı`);
  }

  // ── LLM çağrısı ─────────────────────────────────────
  const system = trimmedHistory.length > 0
    ? `Geçmiş:\n${trimmedHistory.join("\n")}\n\nYukarıdaki bağlamı kullanarak cevap ver.`
    : "Sen yardımcı bir AI çalışanısın. Kısa ve net cevap ver.";

  const response = await callLLM(model, system, compressedInput);

  // Cache'e kaydet
  await setCache(cacheKey, {
    agentId:    "optimizer",
    model,
    output:     response.text,
    tokenUsed:  response.tokenUsed,
    durationMs: 0,
  });

  // Dedup bekleyenlere bildir
  resolveTask(input.task, {
    text:      response.text,
    model,
    tokenUsed: response.tokenUsed,
    savedBy,
  });

  return {
    text:      response.text,
    model,
    tokenUsed: response.tokenUsed,
    savedBy,
  };
}