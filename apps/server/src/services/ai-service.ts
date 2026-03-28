import { serverConfig } from "../config.js";
import type { SupportedAiProvider } from "../types.js";

interface ChatInput {
  provider: SupportedAiProvider;
  apiKey: string;
  message: string;
  systemPrompt?: string;
  model?: string;
}

export class AiService {
  async chat(input: ChatInput) {
    if (input.provider === "openai") {
      return this.chatOpenAi(input);
    }

    if (input.provider === "claude") {
      return this.chatClaude(input);
    }

    return this.chatGemini(input);
  }

  private async chatOpenAi(input: ChatInput) {
    const response = await fetch(`${serverConfig.openAiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: input.model ?? "gpt-4o-mini",
        messages: [
          ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
          { role: "user", content: input.message }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`);
    }

    const data = await response.json();
    return {
      provider: "openai" as const,
      model: data.model,
      text: data.choices?.[0]?.message?.content ?? ""
    };
  }

  private async chatGemini(input: ChatInput) {
    const model = input.model ?? "gemini-1.5-flash";
    const response = await fetch(`${serverConfig.geminiBaseUrl}/models/${model}:generateContent?key=${input.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: input.systemPrompt ? { parts: [{ text: input.systemPrompt }] } : undefined,
        contents: [{ role: "user", parts: [{ text: input.message }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const data = await response.json();
    return {
      provider: "gemini" as const,
      model,
      text: data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n") ?? ""
    };
  }

  private async chatClaude(input: ChatInput) {
    const model = input.model ?? "claude-3-5-sonnet-latest";
    const response = await fetch(`${serverConfig.claudeBaseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: input.systemPrompt,
        messages: [{ role: "user", content: input.message }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude request failed with status ${response.status}.`);
    }

    const data = await response.json();
    return {
      provider: "claude" as const,
      model,
      text: data.content?.map((part: { text?: string }) => part.text ?? "").join("\n") ?? ""
    };
  }
}
