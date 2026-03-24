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
  // Local LLM (LM Studio) — önce dene
  if (process.env.USE_LOCAL_LLM === "true") {
    try {
      return await callLocalLLM(systemPrompt, userInput);
    } catch (err) {
      console.log("[Local LLM] hata, fallback'e geçiliyor:", err);
      // Fallback: normal modele geç
    }
  }

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

// ─── Local LLM (LM Studio) ───────────────────────────────
async function callLocalLLM(
  system: string,
  user: string
): Promise<LLMResponse> {
  const startTime = Date.now();

  const res = await fetch("http://localhost:1234/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "local-model", // LM Studio'da ne yazdıysan
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Local LLM hatası: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { total_tokens: number };
  };

  // Token tahmini (LM Studio token sayısı döndürmeyebilir)
  const estimatedTokens = Math.ceil((system.length + user.length) / 4) + 200;

  console.log(`[Local LLM] yanıt süresi: ${Date.now() - startTime}ms`);

  return {
    text: data.choices[0].message.content,
    tokenUsed: data.usage?.total_tokens ?? estimatedTokens,
  };
}

// ─── Mevcut API'ler aynen kalır ──────────────────────────
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
        { role: "user", content: user },
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
    text: data.choices[0].message.content,
    tokenUsed: data.usage.total_tokens,
  };
}

async function callGeminiMock(
  system: string,
  user: string
): Promise<LLMResponse> {
  console.log("[Gemini Mock] çağrıldı");
  return {
    text: `Gemini cevabı: ${user.slice(0, 50)}...`,
    tokenUsed: 120,
  };
}

async function callClaudeMock(
  system: string,
  user: string
): Promise<LLMResponse> {
  console.log("[Claude Mock] çağrıldı");
  return {
    text: `Claude cevabı: ${user.slice(0, 50)}...`,
    tokenUsed: 100,
  };
}

// Gerçek Gemini (billing aktif olunca kullanılır)
export async function callGeminiReal(
  system: string,
  user: string
): Promise<LLMResponse> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }],
        },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini hatası: ${err}`);
  }

  const data = await res.json() as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
    usageMetadata: { totalTokenCount: number };
  };

  return {
    text: data.candidates[0].content.parts[0].text,
    tokenUsed: data.usageMetadata.totalTokenCount,
  };
}