const MAX_MESSAGES    = 5;
const MAX_MSG_LENGTH  = 300;

interface MinimizedContext {
  trimmedHistory: string[];
  savedTokens:    number;
}

export function minimizeContext(history: string[]): MinimizedContext {
  if (history.length === 0) {
    return { trimmedHistory: [], savedTokens: 0 };
  }

  // Son N mesajı al
  const recent  = history.slice(-MAX_MESSAGES);

  // Uzun mesajları kes
  const trimmed = recent.map(msg =>
    msg.length > MAX_MSG_LENGTH
      ? msg.slice(0, MAX_MSG_LENGTH) + "...[kesildi]"
      : msg
  );

  // Tahmini token tasarrufu (4 karakter ≈ 1 token)
  const originalTokens = history.join(" ").length / 4;
  const trimmedTokens  = trimmed.join(" ").length / 4;
  const savedTokens    = Math.floor(originalTokens - trimmedTokens);

  return { trimmedHistory: trimmed, savedTokens };
}