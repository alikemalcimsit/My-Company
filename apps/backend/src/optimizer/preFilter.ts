const STATIC_RULES: Array<{ pattern: RegExp; response: string }> = [
  { pattern: /merhaba|selam|hey/i,       response: "Merhaba! Nasıl yardımcı olabilirim?" },
  { pattern: /teşekkür|sağ ol/i,         response: "Rica ederim!" },
  { pattern: /fiyat nedir|ücret ne/i,    response: "Fiyat bilgisi için ekibimizle iletişime geçin." },
  { pattern: /nasılsın|naber/i,          response: "İyiyim, teşekkürler! Sana nasıl yardımcı olabilirim?" },
];

export function preFilter(input: string): string | null {
  for (const rule of STATIC_RULES) {
    if (rule.pattern.test(input)) {
      return rule.response;
    }
  }
  if (input.trim().length < 5) {
    return "Lütfen sorunuzu biraz daha açar mısınız?";
  }
  return null; // LLM gerekiyor
}