import { IntentService } from "../services/intent-service.js";
import type { ParsedCommand } from "../types.js";

const BARE_URL_PATTERN = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i;

const normalizeUrl = (value: string | null) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
};

export const parseCommand = (input: string, intentService = new IntentService()): ParsedCommand => {
  const normalizedInput = input.trim();
  const classified = intentService.classify(normalizedInput);
  const matchedUrl = normalizedInput.match(BARE_URL_PATTERN)?.[1] ?? classified.extractedUrl ?? null;
  const url = normalizeUrl(matchedUrl);
  const lowSignal = classified.confidence < 0.65 && classified.secondary.length === 0;

  return {
    input,
    normalizedInput,
    intent: classified.primary,
    secondaryIntents: classified.secondary,
    confidence: classified.confidence,
    url,
    hasUrl: Boolean(url),
    isAmbiguous: lowSignal
  };
};
