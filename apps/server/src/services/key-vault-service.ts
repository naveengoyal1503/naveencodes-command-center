import { serverConfig } from "../config.js";
import type { ProviderKeyRecord, SupportedAiProvider } from "../types.js";
import { JsonStore } from "../store/json-store.js";
import { CryptoService } from "./crypto-service.js";

type VaultSchema = Record<string, Partial<Record<SupportedAiProvider, ProviderKeyRecord>>>;

export class KeyVaultService {
  private readonly store = new JsonStore<VaultSchema>(serverConfig.paths.keysFile, {});
  private readonly crypto = new CryptoService(serverConfig.encryptionSecret);

  async setProviderKey(userId: string, provider: SupportedAiProvider, apiKey: string) {
    const vault = await this.store.read();
    const scoped = vault[userId] ?? {};
    scoped[provider] = {
      provider,
      encryptedValue: this.crypto.encrypt(apiKey),
      updatedAt: new Date().toISOString()
    };
    vault[userId] = scoped;
    await this.store.write(vault);
  }

  async getProviderKey(userId: string, provider: SupportedAiProvider) {
    const vault = await this.store.read();
    const record = vault[userId]?.[provider];
    return record ? this.crypto.decrypt(record.encryptedValue) : null;
  }

  async removeProviderKey(userId: string, provider: SupportedAiProvider) {
    const vault = await this.store.read();
    if (vault[userId]) {
      delete vault[userId]?.[provider];
      await this.store.write(vault);
    }
  }

  async listProviderKeys(userId: string) {
    const vault = await this.store.read();
    return Object.values(vault[userId] ?? {}).map((record) => ({
      provider: record?.provider,
      updatedAt: record?.updatedAt,
      masked: "configured"
    }));
  }
}
