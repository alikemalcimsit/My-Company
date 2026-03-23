import { Agent, AgentResult } from "../types";
import { callLLM } from "./llmGateway";

export async function runAgent(
  agent: Agent,
  input: string
): Promise<AgentResult> {
  const start = Date.now();

  console.log(`[${agent.name}] çalışıyor... (model: ${agent.model})`);

  const systemPrompt = `
    Sen "${agent.name}" adlı bir AI çalışanısın.
    Rol: ${agent.role}
    Hedef: ${agent.goal}
    Kısa, net ve uygulanabilir cevap ver.
  `.trim();

  const response = await callLLM(agent.model, systemPrompt, input);

  const result: AgentResult = {
    agentId:    agent.id,
    model:      agent.model,
    output:     response.text,
    tokenUsed:  response.tokenUsed,
    durationMs: Date.now() - start,
  };

  console.log(
    `[${agent.name}] tamamlandı — ${result.tokenUsed} token, ${result.durationMs}ms`
  );

  return result;
}