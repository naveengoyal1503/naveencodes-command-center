import { serverConfig } from "../config.js";
import { AiService } from "../services/ai-service.js";
import { KeyVaultService } from "../services/key-vault-service.js";
import type { SupportedAiProvider } from "../types.js";

export class IntelligenceAiClient {
  constructor(
    private readonly aiService = new AiService(),
    private readonly keyVaultService = new KeyVaultService()
  ) {}

  async runForUser(input: {
    userId: string;
    provider?: SupportedAiProvider;
    message: string;
    systemPrompt?: string;
    model?: string;
  }) {
    const provider = input.provider ?? serverConfig.defaultAiProvider;
    const apiKey = await this.keyVaultService.getProviderKey(input.userId, provider);
    if (!apiKey) {
      return null;
    }

    return this.aiService.chat({
      provider,
      apiKey,
      message: input.message,
      systemPrompt: input.systemPrompt,
      model: input.model
    });
  }
}
