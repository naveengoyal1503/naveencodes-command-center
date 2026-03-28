import fs from "node:fs/promises";
import path from "node:path";

export class JsonStore<T> {
  constructor(private readonly filePath: string, private readonly fallback: T) {}

  async read(): Promise<T> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(content) as T;
    } catch {
      await this.write(this.fallback);
      return this.fallback;
    }
  }

  async write(value: T) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}
