import { Agent, AgentResult }    from "../types";
import { callLLM }               from "./llmGateway";
import { emitToProject }         from "../api/socket";

export async function runAgent(
  agent:     Agent,
  input:     string,
  projectId?: string
): Promise<AgentResult> {
  const start = Date.now();

  console.log(`[${agent.name}] çalışıyor... (model: ${agent.model})`);

  // Başladı eventi
  if (projectId) {
    emitToProject(projectId, "activity", {
      type:      "agent:start",
      agentName: agent.name,
      model:     agent.model,
      message:   `${agent.name} görevi aldı`,
      timestamp: Date.now(),
    });
  }

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

  console.log(`[${agent.name}] tamamlandı — ${result.tokenUsed} token, ${result.durationMs}ms`);

  // Tamamlandı eventi
  if (projectId) {
    emitToProject(projectId, "activity", {
      type:      "agent:done",
      agentName: agent.name,
      model:     agent.model,
      message:   `${agent.name} görevi tamamladı`,
      tokenUsed: result.tokenUsed,
      durationMs: result.durationMs,
      timestamp: Date.now(),
    });
  }

  return result;
}