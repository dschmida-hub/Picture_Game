const bannedPatterns = [
  /\b(kill yourself|suicide|rape|nazi)\b/i,
];

export function containsBannedContent(text: string) {
  return bannedPatterns.some((pattern) => pattern.test(text));
}
