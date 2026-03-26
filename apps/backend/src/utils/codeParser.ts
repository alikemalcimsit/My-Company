export function parseCodeFromResponse(response: string): {
  code: string;
  filePath?: string;
  language?: string;
} | null {
  // Markdown kod bloğunu bul
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  // İlk kod bloğunu al
  const match = matches[0];
  const language = match[1] || "text";
  const code = match[2].trim();
  
  // Dosya yolunu tahmin et
  let filePath = null;
  const pathMatch = response.match(/dosya[:\s]+([\/\w\.-]+)/i);
  if (pathMatch) {
    filePath = pathMatch[1];
  }
  
  return {
    code,
    filePath: filePath || undefined,
    language,
  };
}

export function extractJSONFromResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("JSON parse hatası:", err);
  }
  return null;
}