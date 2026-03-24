import { Task, TaskType, ModelName } from "../types";

const MODEL_COST: Record<ModelName, number> = {
  "gpt-3.5-turbo": 1,
  "gemini-pro": 2,
  "claude-sonnet": 3,
  "gpt-4": 8,
  // Local LLM ekle — maliyeti 0
  "local-llm": 0,
};

const ROUTING_TABLE: Record<TaskType, ModelName[]> = {
  simple: ["local-llm", "gpt-3.5-turbo", "gemini-pro"],
  design: ["local-llm", "gemini-pro", "gpt-4"],
  coding: ["local-llm", "gpt-4", "claude-sonnet"],
  analysis: ["local-llm", "claude-sonnet", "gpt-4"],
  complex: ["local-llm", "gpt-4", "claude-sonnet"],
};

export function routeModel(task: Task): ModelName {
  const type = task.type ?? "simple";
  const candidates = ROUTING_TABLE[type];

  // Local LLM aktifse ve kullanılabilir durumdaysa onu dene
  if (process.env.USE_LOCAL_LLM === "true") {
    // İlk sırada local-llm var
    return "local-llm" as ModelName;
  }

  return candidates[0];
}

// Başarı oranına göre dinamik routing (ileri seviye)
export function routeModelWithFallback(
  task: Task,
  successRates: Partial<Record<ModelName, number>>
): ModelName {
  const type = task.type ?? "simple";
  const candidates = ROUTING_TABLE[type];

  // Local LLM varsa ve kullanılabilirse öncelik ver
  if (
    process.env.USE_LOCAL_LLM === "true" &&
    (successRates["local-llm"] ?? 0.9) > 0.7
  ) {
    return "local-llm" as ModelName;
  }

  return candidates.reduce((best, current) => {
    const bestScore = (successRates[best] ?? 0.8) / MODEL_COST[best];
    const currentScore =
      (successRates[current] ?? 0.8) / MODEL_COST[current];
    return currentScore > bestScore ? current : best;
  });
}