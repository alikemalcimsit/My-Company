import { ModelName } from "../types";

export interface LLMResponse {
  text: string;
  tokenUsed: number;
}

export async function callLLM(
  model: ModelName,
  systemPrompt: string,
  userInput: string
): Promise<LLMResponse> {
  if (model === "gpt-4" || model === "gpt-3.5-turbo") {
    return callOpenAI(model, systemPrompt, userInput);
  }
  if (model === "gemini-pro") {
    return callGeminiMock(systemPrompt, userInput);
  }
  if (model === "claude-sonnet") {
    return callClaudeMock(systemPrompt, userInput);
  }
  throw new Error(`Bilinmeyen model: ${model}`);
}

async function callOpenAI(
  model: string,
  system: string,
  user: string
): Promise<LLMResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI hatası: ${err}`);
  }

  const data = await res.json() as {
  choices: Array<{ message: { content: string } }>;
  usage: { total_tokens: number };
};
  return {
    text:       data.choices[0].message.content,
    tokenUsed:  data.usage.total_tokens,
  };
}

// Gemini henüz mock — ileriki günlerde gerçek entegrasyon yapılacak
async function callGeminiMock(
  system: string,
  user: string
): Promise<LLMResponse> {
  console.log("[Gemini Mock] çağrıldı");
  return {
    text:      `Gemini cevabı: ${user.slice(0, 50)}...`,
    tokenUsed: 120,
  };
}

// Claude henüz mock — ileriki günlerde gerçek entegrasyon yapılacak
async function callClaudeMock(
  system: string,
  user: string
): Promise<LLMResponse> {
  console.log("[Claude Mock] çağrıldı");
  return {
    text:      `Claude cevabı: ${user.slice(0, 50)}...`,
    tokenUsed: 100,
  };
}