import { AgentResult } from "../types";

export function mergeOutputs(results: AgentResult[]): AgentResult {
  if (results.length === 1) return results[0];

  // En verimli çıktıyı seç: output uzunluğu / token kullanımı
  return results.reduce((prev, curr) => {
    const prevScore = prev.output.length / (prev.tokenUsed || 1);
    const currScore = curr.output.length / (curr.tokenUsed || 1);
    return currScore > prevScore ? curr : prev;
  });
}