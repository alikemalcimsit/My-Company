const FILLER_PATTERNS: RegExp[] = [
  /lütfen\s+/gi,
  /acaba\s+/gi,
  /bir\s+şekilde\s+/gi,
  /mümkünse\s+/gi,
  /eğer\s+olursa\s+/gi,
  /\s{2,}/g,   // çift boşluk → tek boşluk
];

export function compressPrompt(prompt: string): string {
  let compressed = prompt;
  for (const pattern of FILLER_PATTERNS) {
    compressed = compressed.replace(pattern, " ");
  }
  return compressed.trim();
}

// Tahmini token sayısı (GPT: ~4 karakter = 1 token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}